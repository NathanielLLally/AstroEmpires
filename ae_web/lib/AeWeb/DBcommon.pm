package AeWeb::DBcommon;
use AeWeb::Schema;
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
      $s->createDatabase($db);
      $dbh = DBI->connect_cached("DBI:mysql:database=$db;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;
    }
  };
  $dbh;
}

sub schema
{
  my ($s,$server) = (@_);
  my ($db, $key, $schema) = ($server,'_schema_',undef);
  if (defined $db and $db ne 'ae') {
    $db =~ s/^(\S)/ae\u$1/;
  }
  $key .= $db;

  $schema = $s->{$key};
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
  }
  $schema;
}

#  replicate aeBravo schemas and triggers
#  show create table
#
sub createDatabase
{
  my ($s, $db) = @_;
  my @stuff = $s->schema('bravo')->storage->dbh_do(
    sub {
      my ($storage, $dbh, $dbBase, $dbNew) = @_;

      $s->app->log->debug(sprintf("%s %s", $dbBase, $dbNew));

      my ($sth, $rs, @tables, %procs) = (undef, undef, (), ());
      $sth = $dbh->table_info('', '', undef, "TABLE");
      $rs = $sth->fetchall_arrayref();
      foreach my $row (@$rs) {
        push @tables, $row->[2];
      }

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
      $s->app->log->debug("getting body of $p");
      }

      $dbh->do("create database $dbNew");

      foreach my $t (@tables) {
        $dbh->do(sprintf(
              "create table %s.%s like %s", $dbNew, $t, $t
              ));
      }

      $dbh->do("use $dbNew");

      foreach my $k (keys %procs) {
      $s->app->log->debug("$k");
        $dbh->do($procs{$k});
      }
    },
    'aeBravo', $db
  );

}

1;
