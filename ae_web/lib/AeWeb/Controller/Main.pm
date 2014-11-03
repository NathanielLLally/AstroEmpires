package AeWeb::Controller::Main;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::IOLoop;
use Mojo::Util qw/dumper/;
#use Mojolicious::Session;
use URI::Escape;
use URI;
use DBI;
use Try::Tiny;
use Data::Dumper;

sub getServers {
  my $s = shift;
  my $dbh = DBI->connect_cached("DBI:mysql:database=ae;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;
  my (@headers, $sth, $rs);
  my @servers;
  $sth = $dbh->prepare_cached("select distinct server from astro");
  $sth->execute();
  $rs = $sth->fetchall_arrayref();
  foreach my $row (@$rs) {
    push @servers, $row->[0];
  }
  $s->stash( servers => \@servers);
}

sub getViews {
  my $s = shift;
  my $dbh = DBI->connect_cached("DBI:mysql:database=ae;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;
  my (@headers, $sth, $rs);

#  header.html.ep wants a list of database views
#
  $sth = $dbh->table_info('', 'ae', undef, "VIEW");
  $rs = $sth->fetchall_arrayref();
  my @views;
  foreach my $row (@$rs) {
    my $view = $row->[2];
    if ($view =~ /^v/) {
      $view =~ s/^v//;
      push @views, $view;
    }
  }

  $s->stash(
    views => \@views,
  );
}

sub getProcs {
  my $s = shift;
  my $dbh = DBI->connect_cached("DBI:mysql:database=ae;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;
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
    }
    push @proc, $el;
#    $s->app->log->debug(Dumper($row));
  }

  $s->stash(
    procs => \@proc,
  );
}

sub index {
  my $s = shift;
  $s->getServers;
  $s->getViews;
  $s->getProcs;

  $s->stash(playerID => $s->session('playerID'));
  $s->stash(server => $s->session('server'));

  $s->render;
}

sub displayProc {
  my $s = shift;
  if (not $s->session('playerID')) {
    $s->redirect_to('/ae');
    return;
  }

  $s->getServers;
  $s->getProcs;
  $s->getViews;

  $s->stash(playerID => $s->session('playerID'));
  $s->stash(server => $s->session('server'));

  $s->app->log->debug("sesh pid: ".$s->session->{playerID});

  my $dbh = DBI->connect_cached("DBI:mysql:database=ae;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;

  my $proc = $s->req->url->path;
  $proc =~ s/.*\///;
  $s->app->log->debug("showing proc p$proc");

  my (@headers, $sth, $rs);

  $sth = $dbh->prepare("call p$proc(?,?)");
  try {
    $sth->execute($s->session('server'), $s->session('playerID'));
  } catch {
    die "call error: $_";
  };
  @headers = @{ $sth->{NAME} };
  $rs = $sth->fetchall_arrayref();

  my $shortFieldName = {
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

  $s->stash(
    procName => $proc,
    shortFieldName => $shortFieldName,
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

  $s->getServers;
  $s->getViews;

  $s->stash(playerID => $s->session('playerID'));
  $s->stash(server => $s->session('server'));

  $s->app->log->debug("sesh pid: ".$s->session->{playerID});

  my $dbh = DBI->connect_cached("DBI:mysql:database=ae;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;

  my $view = $s->req->url->path;
  $view =~ s/.*\///;
  $s->app->log->debug("showing view v$view");

  my (@headers, $sth, $rs);

  #  i want the columns in the order specified by view
  #
  $sth = $dbh->column_info('ae', "v$view", undef, undef);
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

  my $shortFieldName = {
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

  $s->stash(
    viewName => $view,
    shortFieldName => $shortFieldName,
    headers => \@headers,
    resultSet => $rs,
  );
  $s->render(template => 'main/displayView');
}

sub select {
  my $s = shift;
  if (not $s->session('playerID')) {
    $s->redirect_to('/ae');
    return;
  }

  $s->getServers;
  $s->getViews;

  $s->stash(playerID => $s->session('playerID'));

  my $server = $s->req->param('server');
  $s->session(server => $server);
  $s->stash(server => $server);

  $s->redirect_to($s->req->headers->referrer);
}

sub login {
  my $s = shift;
  $s->getServers;
  $s->getViews;

#  my $sesh = Mojolicious::Sessions->new;
#  $sesh->cookie_name('aegis');
#  $sesh->default_expiration(86400);
#  $sesh->store
 
  my $pid = $s->req->param('playerID');
  $s->session(playerID => $pid);
  $s->stash(playerID => $pid);

  $s->app->log->debug("routed to login correctly");
  foreach my $name ($s->req->param) {
    $s->app->log->debug("$name => ".$s->req->param($name));
  }
  $s->redirect_to('/ae');
}

sub logout {
  my $s = shift;
  $s->getServers;
  $s->getViews;
  delete $s->session->{playerID};
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
