package AeWeb::Controller::OldCode;
sub getProcs {
  my $s = shift;
  my ( @headers, $sth, $rs );

  #  header.html.ep wants a list of database views
  #
  $sth = $s->dbh->prepare("show procedure status");
  $sth->execute();
  $rs = $sth->fetchall_arrayref();
  my @oldproc;
  foreach my $row (@$rs) {
    my $el = $row->[1];
    if ( $el =~ /^p/ and $row->[0] eq 'ae' ) {
      $el =~ s/^p//;
      push @oldproc, $el;
    }

    #    $s->app->log->debug(Dumper($row));
  }
  $sth = $s->dbh( $s->session('server') )->prepare("show procedure status");
  $sth->execute();
  $rs = $sth->fetchall_arrayref();
  my @proc;
  foreach my $row (@$rs) {
    my $el = $row->[1];
    my $db = $s->session('server');
    $db =~ s/^(\S)/ae\u$1/;
    $s->app->log->debug(
      sprintf( "db %s in row %s name %s", $db, $row->[1], $row->[0] ) );
    if ( $el =~ /^p/ and $row->[0] eq $db ) {
      $el =~ s/^p//;
      push @proc, $el;
    }

    #    $s->app->log->debug(Dumper($row));
  }

  $s->session(
    oldprocs => \@oldproc,
    newprocs => \@proc,
  );
}

sub getViews {
  my $s   = shift;
  my $dbh = $s->dbh( $s->session('server') );
  my ( @headers, $sth, $rs );

  #  header.html.ep wants a list of database views
  #
  $sth = $dbh->table_info( '', '', undef, "VIEW" );
  $sth->execute();
  $rs = $sth->fetchall_arrayref();
  my @views;
  foreach my $row (@$rs) {
    my $view = $row->[2];
    if ( $view =~ /^v/ ) {
      $view =~ s/^v//;
      push @views, $view;
    }
  }

  $s->session( views => \@views, );
}

sub displayProc {
  my $s = shift;
  if ( not $s->session('playerID') ) {
    $s->redirect_to('/ae');
    return;
  }

  my $dbh = $s->dbh( $s->session('server') );

  my $proc = $s->stash('proc');
  $proc =~ s/.*\///;
  $s->app->log->debug( "showing proc p$proc("
      . $s->session('server') . ","
      . $s->session('playerID') );

  my ( @headers, $sth, $rs );

  $sth = $dbh->prepare("call p$proc(?)");
  try {
    $sth->execute( $s->session('guildTag') );
  }
  catch {
    die "call error: $_";
  };
  @headers = @{ $sth->{NAME} };
  $rs      = $sth->fetchall_arrayref();

  $s->stash(
    procName  => $proc,
    headers   => \@headers,
    resultSet => $rs,
  );
  $s->render( template => 'main/displayProc' );
}

sub displayOldProc {
  my $s = shift;
  if ( not $s->session('playerID') ) {
    $s->redirect_to('/ae');
    return;
  }

  my $dbh = $s->dbh;

  my $proc = $s->stash('proc');
  $proc =~ s/.*\///;
  $s->app->log->debug( "showing proc p$proc("
      . $s->session('server') . ","
      . $s->session('playerID') );

  my ( @headers, $sth, $rs );

  $sth = $dbh->prepare("call p$proc(?,?)");
  try {
    $sth->execute( $s->session('server'), $s->session('playerID') );
  }
  catch {
    die "call error: $_";
  };
  @headers = @{ $sth->{NAME} };
  $rs      = $sth->fetchall_arrayref();

  $s->stash(
    procName  => $proc,
    headers   => \@headers,
    resultSet => $rs,
  );
  $s->render( template => 'main/displayProc' );
}
sub displayView {

  my $s = shift;
  if ( not $s->session('playerID') ) {
    $s->redirect_to('/ae');
    return;
  }

  my $dbh = $s->dbh( $s->session('server') );

  my $view = $s->req->url->path;
  $view =~ s/.*\///;
  $s->app->log->debug("showing view v$view");

  my ( @headers, $sth, $rs );

  #  i want the columns in the order specified by view
  #
  $sth = $dbh->column_info( 'aeBravo', "v$view", undef, undef );
  $rs = $sth->fetchall_arrayref();
  foreach my $row (@$rs) {
    push @headers, $row->[3];
  }

  $sth = $dbh->prepare("select * from v$view");
  try {
    $sth->execute();
  }
  catch {
    die "call error: $_";
  };
  $rs = $sth->fetchall_arrayref();

  $s->stash(
    viewName  => $view,
    headers   => \@headers,
    resultSet => $rs,
  );
  $s->render( template => 'main/displayView' );
}

sub procShell {
  my $s = shift;
  if ( not $s->session('playerID') ) {
    $s->redirect_to('/ae');
    return;
  }

  my $proc = $s->stash('proc');

  $proc =~ s/.*\///;
  $s->app->log->debug(
    sprintf(
      "shell for p%s [%s:%s]",
      $proc,
      $s->session('server'),
      $s->session('playerID')
    )
  );

  my $dbh = $s->dbh( $s->session('server') );

  my ( @headers, $sth, $rs );

  $sth = $dbh->prepare("call p$proc(?,?,?,?)");
  try {
    $sth->execute( $s->session('guildTag'), '', 0, 0 );
  }
  catch {
    die "call error: $_";
  };
  @headers = @{ $sth->{NAME} };
  $rs      = $sth->fetchall_arrayref();

  $s->stash(

    #    json => $rs,
    headers => \@headers,
  );

  $s->render( template => 'main/ajaxProc' );
}

sub ajaxProc {
  my $s = shift;
  if ( not $s->session('playerID') ) {
    $s->redirect_to('/ae');
    return;
  }

  my $dbh = $s->dbh( $s->session('server') );

  my $proc = $s->stash('proc');
  my ( $start, $length, $location ) =
    map { $s->param($_) } qw/iDisplayStart iDisplayLength location/;

  $proc =~ s/.*\///;
  $s->app->log->debug(
    sprintf(
      "ajax response for p%s(%s,%s,%s) [%s:%s]",
      $proc, $location, $start, $length,
      $s->session('server'),
      $s->session('playerID')
    )
  );

  my ( @headers, $sth, $rs );

  $sth = $dbh->prepare("call p$proc(?,?,?,?)");
  try {
    $sth->execute( $s->session('guildTag'), '', $start, $length );
  }
  catch {
    die "call error: $_";
  };
  $rs = $sth->fetchall_arrayref();

  $s->app->log->debug( Dumper( \$rs ) );
  $s->stash(
    json => {
      sEcho                => 1,
      iTotalRecords        => $#{$rs} + 1,
      iTotalDisplayRecords => $#{$rs} + 1,
      aaData               => $rs
    }
  );
  $s->render( status => 200 );
}

sub showImages {
  my $s    = shift;
  my $coll = $s->mango->db->collection('images');

  my $return = 0;
  my $delay  = Mojo::IOLoop->delay(
    sub {
      my ( $delay, @docs ) = @_;
      $s->app->log->debug("delay: $delay @docs");

      #      $s->app->log->debug(Dumper(\@docs));
      #      $s->stash(images => [qw(1 2 3 4 5)]);
      #
      #      xlate BSON
      #
      foreach my $img (@docs) {
        if ( $img->{src} !~ /^data/ ) {
          my $u = URI->new("data:");
          $u->media_type( $img->{type} );
          $u->data( $img->{src} );
          $img->{src} = $u;
        }
      }
      $s->stash( images => \@docs );
      $s->render;
      $return = 1;
    }
  );
  $delay->begin;
  my $img = $coll->find()->all(
    sub {
      my ( $cursor, $err, $docs ) = @_;
      $delay->end(@$docs);
    }
  );

  my @docs;
  @docs = $delay->wait unless Mojo::IOLoop->is_running;

  #  $s->render_later;
  #  block
  while ( not $return ) {
    Mojo::IOLoop->one_tick;
  }
}

1;
