package AeWeb::DBcommon;
use AeWeb::Schema;
use Mojo::Base 'Mojolicious::Controller';
use AeWeb::DBcommon;
use DBI;
use Try::Tiny;
use Data::Dumper;

#  new paradigm aeServer
#    anything non-server specific will remain in ae
#
sub dbh {
  my ($s, $db) = @_;
  if (defined $db and $db ne 'ae') {
    $db =~ s/^(\S)/ae\u$1/;
  } else {
    $db = 'ae';
  }
  my $dbh;
  try {
    $dbh = DBI->connect_cached("DBI:mysql:database=$db;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;
  } catch {
    if ($_ =~ /Unknown database/) {
      $s->createOrUpdateDatabase($db);
      $dbh = DBI->connect_cached("DBI:mysql:database=$db;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;
    }
  };

=pod
  my $default = $dbh->{HandleError};
  $dbh->{HandleError} = sub {
    if ($_[0] =~ /does not exist/) {
      $s->createOrUpdateDatabase($db);
      $s->app->log->debug('caught error '.$_[0]);
    } else {
      return 1 if $default and &$default(@_);
    }
  };
=cut  
  $dbh;
}

sub schema
{
  my ($s,$server) = (@_);
  my ($db, $key, $schema) = ($server,'_schema_',undef);
  if (defined $db and $db ne 'ae') {
    $db =~ s/^(\S)/ae\u$1/;
  }
  if (defined $db) {
    $key .= $db;
    $schema = $s->{$key};
  } elsif (exists ($s->{last_schema_key})) {
    $key = $s->{last_schema_key};
#    $s->app->log->debug('using '.$s->{last_schema_key});

    $schema = $s->{$s->{last_schema_key}};
  }

  if (defined $schema) {
    $schema->storage->ensure_connected;
  } else {
    try {
      $schema = $s->{$key} = AeWeb::Schema->connect(
        "dbi:mysql:$db", 'ae', 'q1w2e3r4',
        { RaiseError => 1, AutoCommit => 1},
        );
      $schema->storage->ensure_connected;
    } catch {
      if ($_ =~ /Unknown database/) {
        $s->createDatabase($db);
        $schema = $s->{$key} = AeWeb::Schema->connect("dbi:mysql:$db", 'ae', 'q1w2e3r4');
#        return $s->schema($server);
      }
    };
    $schema->storage->debugfh(IO::File->new('/tmp/trace.out', 'w'));
    $schema->storage->debug(1);

=pod
    my $dbh = $schema->storage->dbh();
  my $default = $dbh->{HandleError};
  $dbh->{HandleError} = sub {
    if ($_[0] !~ /drop/ and $_[0] =~ /does not exist/) {
      $s->createOrUpdateDatabase($db);
      $s->app->log->debug('caught error '.$_[0]);
    } else {
      return 1 if $default and &$default(@_);
    }
  };
=cut

  }

  if (defined $schema) {
    $s->{last_schema_key} = $key;
#    $s->app->log->debug('setting '.$s->{last_schema_key});
  }
  $schema;
}

#  replicate aeBravo schemas and triggers
#  show create table
#
sub createOrUpdateDatabase
{
  my ($s, $db) = @_;
  my @stuff = $s->schema('bravo')->storage->dbh_do(
    sub {
      my ($storage, $dbh, $dbBase, $dbNew) = @_;

      $s->app->log->debug(sprintf("%s %s", $dbBase, $dbNew));

      my ($sth, $rs, @tables, %procs, %triggers) = (undef, undef, (), (), ());

# tables
#   thanks to create table like, we just need the list
#
      $sth = $dbh->table_info('', '', undef, "TABLE");
      $rs = $sth->fetchall_arrayref();
      foreach my $row (@$rs) {
        push @tables, $row->[2];
      }

#  procedures
#
      $sth = $dbh->prepare("show procedure status");
      $sth->execute();
      $rs = $sth->fetchall_arrayref();
      foreach my $row (@$rs) {
        #$s->app->log->debug(join(",", @$row));
        if ($row->[0] eq $dbBase) {
          $procs{$row->[1]}++;
        }
      }

      foreach my $p (keys %procs) {
        $sth = $dbh->prepare("show create procedure $p");
        $sth->execute();
        $rs = $sth->fetchall_arrayref();
        foreach my $row (@$rs) {
          $procs{$p} = $row->[2];

        }
#      $s->app->log->debug("getting body of $p");
      }

#  triggers
#
      $sth = $dbh->prepare("show triggers");
      $sth->execute();
      $rs = $sth->fetchall_arrayref();
      foreach my $row (@$rs) {
        #$s->app->log->debug(join(",", @$row));
          $triggers{$row->[0]}++;
      }

      foreach my $p (keys %triggers) {
        $sth = $dbh->prepare("show create trigger $p");
        $sth->execute();
        $rs = $sth->fetchall_arrayref();
        foreach my $row (@$rs) {
          $triggers{$p} = $row->[2];
        }
#      $s->app->log->debug("getting body of $p");
      }


      try {
        $dbh->do("create database $dbNew");
        $s->app->log->debug("creating database $dbNew");

      };

      foreach my $t (@tables) {
        try {
          $dbh->do(sprintf(
                "create table %s.%s like %s", $dbNew, $t, $t
                ));
          $s->app->log->debug("adding table $t");

        }
      };

      # relies on a failure death here
      #
      $dbh->do("use $dbNew");

      foreach my $k (keys %procs) {
        my $msg = "adding procedure $k";
        try {
#          $dbh->do("drop procedure $k");
          $dbh->do($procs{$k});
        } catch {
          $msg = "error adding $k:$_";
          if ($_ =~ /already exists/) {
            $msg = "skipping existing procedure $k";
          }
        };
        $s->app->log->debug($msg);
      }
      while (my ($k, $v) = each %triggers) {
        my $msg = "adding trigger $k";
        try {
#          $dbh->do("drop trigger $k");
          $dbh->do($v);
        } catch {
          if ($_ !~ /multiple triggers with the same action time and event for one table/) {
            $msg = "error adding $k:$_";
          } else {
            $msg = "skipping existing trigger $k";
          }
        };
        $s->app->log->debug($msg);
      }

    },
    'aeBravo', $db
  );

}

1;
