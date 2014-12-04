package AeWeb::Controller::Main;
=head1 NAME 

AeWeb::Controller::Main

=head1 METHODS

=cut

use AeWeb::Schema;
use AeWeb::Controller::Ajax::DBIx;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::IOLoop;
use Mojo::Util qw/dumper/;
use URI::Escape;
use URI;
use Try::Tiny;

#  this is a dB driven app afterall
use base 'AeWeb::DBcommon';

#timelocationtagownerleveleconinc %tradesccfleetdefenses

=head2 getServers() 
  return list of aeDatabases 

  the dB is set up so that every ae server has it's own database
  named aeServer where server is in the following list

=cut

sub getServers {
  my $s = shift;

  #  my $dbh = $s->dbh($s->session('server'));
  my $dbh = $s->dbh;
  my ( @headers, $sth, $rs );
  my @servers;

  #  $sth = $dbh->prepare_cached("select distinct server from astro");
  $sth = $dbh->prepare_cached("show databases");
  $sth->execute();
  $rs = $sth->fetchall_arrayref();
  foreach my $row (@$rs) {
    if ( $row->[0] =~ /^ae(\S+)$/ ) {
      push @servers, lc($1);
    }
    else {
      #      $s->app->log->debug(dumper($row));
    }
  }
  $s->session( servers => \@servers );
}

=head2 getDbData() convenience function to call all session setup methods

=cut

sub getDbData {
  my $s = shift;
  $s->getServers;
  my $obj = new AeWeb::Controller::Ajax::DBIx;
  $s->app->log->debug('calls: ');
  $s->app->log->debug(dumper( $obj->listCalls() ));
  $s->session(
    dbic => $obj->listCalls,
    shortFieldName => $obj->shortFieldName,
  );
}

sub index {
  my $s = shift;

  $s->render;
}

=head2 updatePassword() dialog to change password

=cut

sub updatePassword {
  my $s = shift;
  if ( not $s->session('playerID') ) {
    $s->redirect_to('/ae');
    return;
  }

  my $password = $s->req->param('password');
  if ( defined $password and length $password > 0 ) {

    my $sth = $s->dbh->prepare(
      qq/
        update player set password = ? where playerId = ?
        /
    );
    $sth->execute( $password, $s->session('playerID') );
    $s->session( changePass => 2 );
  }
  else {
    $s->app->log->debug("bad password [$password]");
  }
  $s->redirect_to( $s->req->headers->referrer );
}

sub select {
  my $s = shift;
  if ( not $s->session('playerID') ) {
    $s->redirect_to('/ae');
    return;
  }

  my $server = $s->req->param('server');
  $s->session( server => $server );

  my $sth = $s->dbh($server)->prepare(
    qq/
      update player set defaultServer = ? where id = ?
      /
  );
  $sth->execute( $server, $s->session('playerID') );

  $s->redirect_to( $s->req->headers->referrer );
}

sub login {
  my $s = shift;
  $s->getDbData;

  my $pid = $s->req->param('playerID');
  my ( @headers, $sth, $rs );
  $sth = $s->dbh->prepare_cached(
    "select name,defaultServer,password from player where id=?");
  $sth->execute($pid);
  $rs = $sth->fetchall_arrayref( {} );
  my $pNfo = @$rs[0];
  if ( $s->req->param('password') eq $pNfo->{password}
    and length $pNfo->{password} > 0 )
  {
    $s->session( playerID   => $pid );
    $s->session( playerName => $pNfo->{name} );
    $s->session( server     => $pNfo->{defaultServer} );
    if ( $pNfo->{password} eq 'onetwothreefourideclareathumbwar' ) {
      $s->session( changePass => 1 );
    }
    my $schema   = $s->schema( $s->session('server') );
    my $dbPlayer = $schema->resultset('Player')->find($pid);
    if ( defined $dbPlayer ) {
      $s->session( 'guildTag' => $dbPlayer->guildTag );
    }
    else {
      $s->session( 'guildTag' => undef );
    }

    #    my $dbPlayer = $schema->resultset('Player')->find('7151');

  }
  $s->redirect_to('/ae');
}

sub logout {
  my $s = shift;
  delete $s->session->{playerID};
  $s->session( expires => 1 );
  $s->redirect_to('/ae');
}

1;
