package AeWeb::Controller::Main;
use AeWeb::Schema;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::IOLoop;
use Mojo::Util qw/dumper/;
#use Mojolicious::Session;
use URI::Escape;
use URI;
use DBI;
use Try::Tiny;
use Data::Dumper;

our $shortFieldName = {
    starLoc => 'system',
    lastScan => 'last scan',
    guildTag => 'tag',
    ownerTag => 'tag',
    occupier => 'occ',
    occupierTag => 'tag',
    economy => 'econ',
    ownerIncome => 'inc %',
    tradeRoutes => 'trades',
    jumpGate => 'jg',
    commandCenters => 'cc',
    barracks => 'b',
    laserTurrets => 'lt',
    missileTurrets => 'mt',
    ionTurrets => 'it',
    photonTurrets => 'pt',
    disruptorTurrets => 'dt',
    deflectionShields => 'ds',
    planetaryShields => 'ps',
    planetaryRing => 'pr',
  };

sub dbh {
  my ($s, $db) = @_;
  if (defined $db) {
    $db =~ s/^(\S)/ae\u$1/;
  } else {
    $db = "ae";
  }
  my $dbh = DBI->connect_cached("DBI:mysql:database=$db;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;
  $dbh;
}

sub createDatabase
{
  my ($s, $db) = @_;
}

sub schema
{
  my ($s,$server) = (@_);
  $s->app->log->debug('schema got server:'.$server);
  my ($db, $key, $schema) = ($server,'_schema_',undef);
  $db =~ s/^(\S)/ae\u$1/;
  $key .= $db;

  $schema = $s->{$key};
  if (defined $schema) {
    $schema->storage->ensure_connected;
  } else {
    try {
      $schema = $s->{$key} = AeWeb::Schema->connect("dbi:mysql:$db", 'ae', 'q1w2e3r4');
    } catch {
      if ($_ =~ /Unknown database/) {
        $s->createDatabase($db);
      }
    };
    $schema->storage->debugfh(IO::File->new('/tmp/trace.out', 'w'));
    $schema->storage->debug(1);
  }
  $schema;
}

sub getServers {
  my $s = shift;
  my $dbh = $s->dbh;
  my (@headers, $sth, $rs);
  my @servers;
  $sth = $dbh->prepare_cached("select distinct server from astro");
  $sth->execute();
  $rs = $sth->fetchall_arrayref();
  foreach my $row (@$rs) {
    push @servers, $row->[0];
  }
  $s->session( servers => \@servers );
}

sub getViews {
  my $s = shift;
  my $dbh = $s->dbh('bravo');
  my (@headers, $sth, $rs);

#  header.html.ep wants a list of database views
#
  $sth = $dbh->table_info('', '', undef, "VIEW");
  $rs = $sth->fetchall_arrayref();
  my @views;
  foreach my $row (@$rs) {
    my $view = $row->[2];
    if ($view =~ /^v/) {
      $view =~ s/^v//;
      push @views, $view;
    }
  }

  $s->session(
    views => \@views,
  );
}

sub getProcs {
  my $s = shift;
  my $dbh = $s->dbh;
  my (@headers, $sth, $rs);

#  header.html.ep wants a list of database views
#
  $sth = $dbh->prepare("show procedure status");
  $sth->execute();
  $rs = $sth->fetchall_arrayref();
  my @proc;
  foreach my $row (@$rs) {
    my $el = $row->[1];
    if ($el =~ /^p/) {
      $el =~ s/^p//;
      push @proc, $el;
    }
#    $s->app->log->debug(Dumper($row));
  }

  $s->session(
    oldprocs => \@proc,
  );
}

sub getDbData {
  my $s = shift;
  $s->getServers;
  $s->getViews;
  $s->getProcs;
  $s->session(
    dbic => ['AllBases', 'Usage'],
    shortFieldName => $shortFieldName,
  );
}

sub index {
  my $s = shift;

  $s->render;
}

sub displayData {
  my $s = shift;
  unless (defined $s->session('playerID') and defined $s->session('server')) {
    $s->redirect_to('/ae');
    return;
  }
  my $data = $s->stash->{tag};
  $s->app->log->debug("showing data $data ".$s->session('server').",". $s->session('playerID'));

  my $schema = $s->schema($s->session('server'));
  my (@headers, @data);
  my %dispatch = (
    AllBases => sub {
      my $s = shift;
  $s->app->log->debug(ref($schema));
      my $rs = $schema->resultset('Base')->search(
        { },
        { join => 'detail' }
        );
      my $row = $rs->next;
      my %cols = $row->get_columns;
      @headers = grep { exists $cols{$_} } $row->result_source->columns;
      do {
        push @data, [map { $row->get_column($_) } @headers];
      } while ($row = $rs->next);
      $s->app->log->debug(Dumper(\@data));
    }
  );
  if (exists $dispatch{$data}) {
    $dispatch{$data}->($s);
  }
  $s->stash(
      headers => \@headers,
      resultSet => \@data,
      title => $data
      );
  $s->render(template => 'main/displayData');
}

sub displayProc {
  my $s = shift;
  if (not $s->session('playerID')) {
    $s->redirect_to('/ae');
    return;
  }

  my $dbh = $s->dbh;

  my $proc = $s->req->url->path;
  $proc =~ s/.*\///;
  $s->app->log->debug("showing proc p$proc(".$s->session('server').",". $s->session('playerID'));

  my (@headers, $sth, $rs);

  $sth = $dbh->prepare("call p$proc(?,?)");
  try {
    $sth->execute($s->session('server'), $s->session('playerID'));
  } catch {
    die "call error: $_";
  };
  @headers = @{ $sth->{NAME} };
  $rs = $sth->fetchall_arrayref();

  $s->stash(
    procName => $proc,
    headers => \@headers,
    resultSet => $rs,
  );
  $s->render(template => 'main/displayProc');
}

sub displayView {

  my $s = shift;
  if (not $s->session('playerID')) {
    $s->redirect_to('/ae');
    return;
  }

  my $dbh = $s->dbh($s->session('server'));

  my $view = $s->req->url->path;
  $view =~ s/.*\///;
  $s->app->log->debug("showing view v$view");

  my (@headers, $sth, $rs);

  #  i want the columns in the order specified by view
  #
  $sth = $dbh->column_info('aeBravo', "v$view", undef, undef);
  $rs = $sth->fetchall_arrayref();
  foreach my $row (@$rs) {
    push @headers, $row->[3];
  }

  $sth = $dbh->prepare("select * from v$view");
  try {
    $sth->execute();
  } catch {
    die "call error: $_";
  };
  $rs = $sth->fetchall_arrayref();

  $s->stash(
    viewName => $view,
    headers => \@headers,
    resultSet => $rs,
  );
  $s->render(template => 'main/displayView');
}

sub updatePassword {
  my $s = shift;
  if (not $s->session('playerID')) {
    $s->redirect_to('/ae');
    return;
  }

  my $password = $s->req->param('password');
  if (defined $password and length $password > 0) {

    my $sth = $s->dbh->prepare(qq/
      update player set password = ? where playerId = ?
        /);
    $sth->execute($password, $s->session('playerID'));
    $s->session(changePass => 2);
  } else {
    $s->app->log->debug("bad password [$password]");
  }
  $s->redirect_to($s->req->headers->referrer);
}

sub select {
  my $s = shift;
  if (not $s->session('playerID')) {
    $s->redirect_to('/ae');
    return;
  }

  my $server = $s->req->param('server');
  $s->session(server => $server);

  my $sth = $s->dbh->prepare(qq/
    update player set defaultServer = ? where playerId = ?
      /);
  $sth->execute($server, $s->session('playerID'));

  $s->redirect_to($s->req->headers->referrer);
}

sub login {
  my $s = shift;
  $s->getDbData;

  my $pid = $s->req->param('playerID');
  my (@headers, $sth, $rs);
  $sth = $s->dbh->prepare_cached("select name,defaultServer,password from player where id=?");
  $sth->execute($pid);
  $rs = $sth->fetchall_arrayref({});
  my $pNfo = @$rs[0];
  if ($s->req->param('password') eq $pNfo->{password} and length $pNfo->{password} > 0) {
    $s->session(playerID => $pid);
    $s->session(playerName => $pNfo->{name});
    $s->session(server => $pNfo->{defaultServer});
    if ($pNfo->{password} eq 'onetwothreefourideclareathumbwar') {
      $s->session(changePass => 1);
    }
  }
  $s->redirect_to('/ae');
}


sub logout {
  my $s = shift;
  delete $s->session->{playerID};
  $s->session(expires => 1);
  $s->redirect_to('/ae');
}

sub showImages {
  my $s = shift;
  my $coll = $s->mango->db->collection('images');

  my $return = 0;
  my $delay = Mojo::IOLoop->delay( sub {
      my ($delay, @docs) = @_;
      $s->app->log->debug("delay: $delay @docs");
#      $s->app->log->debug(Dumper(\@docs));
#      $s->stash(images => [qw(1 2 3 4 5)]);
#
#      xlate BSON
#
      foreach my $img (@docs) {
        if ($img->{src} !~ /^data/) {
          my $u = URI->new("data:");
          $u->media_type($img->{type});
          $u->data($img->{src});
          $img->{src} = $u;
        }
      }
      $s->stash(images => \@docs);
      $s->render;
      $return = 1;
  });;
  $delay->begin;
  my $img =  $coll->find()->all(sub {
    my ($cursor, $err, $docs) = @_;
    $delay->end(@$docs);
  });

  my @docs;
    @docs = $delay->wait unless Mojo::IOLoop->is_running;


#  $s->render_later;
  #  block
  while (not $return) {
   Mojo::IOLoop->one_tick;
 }
}

1;
