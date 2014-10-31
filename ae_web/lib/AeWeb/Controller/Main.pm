package AeWeb::Controller::Main;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::IOLoop;
use Mojo::Util qw/dumper/;
use URI::Escape;
use URI;
use DBI;
use Try::Tiny;

sub index {
  my $s = shift;

  my $dbh = DBI->connect_cached("DBI:mysql:database=ae;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;

  my (@headers, $sth, $rs);
  $sth = $dbh->table_info('', 'ae', undef, "VIEW");
  $rs = $sth->fetchall_arrayref();
  my @views;
  foreach my $row (@$rs) {
    my $view = $row->[2];
    $view =~ s/^v//;
    push @views, $view;
  }

  my $view = $s->req->url->path;
  $s->render;
}

sub displayView {
  my $s = shift;

  my $dbh = DBI->connect_cached("DBI:mysql:database=ae;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;

  my $view = $s->req->url->path;
  $view =~ s/.*\///;
  $s->app->log->debug("showing view v$view");

  my (@headers, $sth, $rs);

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
    resultSet => $rs
  );
  $s->render(template => 'main/displayView');
}

sub login {
  my $s = shift;
  
  $s->app->log->debug("routed to login correctly");
  foreach my $name ($s->req->param) {
    $s->app->log->debug("$name => ".$s->req->param($name));
  }
  $s->render;
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
