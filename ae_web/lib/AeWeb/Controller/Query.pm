package AeWeb::Controller::Query;
use AeWeb::Schema;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::JSON;
use URI::Escape;
use Try::Tiny;
use DateTime;
use DateTime::Format::DateManip;
use Date::Manip;
use Data::Dumper;

use base 'AeWeb::DBcommon';

my $reLoc = qr/(?<loc>(?<galaxy>[A-Za-z][0-9]{2}):?(?<region>[0-9]{2})?:?(?<system>[0-9]{2})?:?(?<astro>[0-9]{2})?)/;

my $json = Mojo::JSON->new;

#  TODO:
#
#  Moose type validation for assertHas replacement
#
#

sub scoutGalaxy
{
  my ($s, $ctx) = @_;
  my $schema = $s->schema;

  my %ret;
  $ret{ctx} = $ctx;
  $ctx->{galaxy} =~ /^$reLoc$/;
  my $a = $ctx->{scouts};
  my $start = $ctx->{start};

  my $r = $s->orderRegions($ctx);
  my @queues;

  foreach my $el (@{ $r->{batch}}) {
    my ($err,$astro);
    $astro = $el->{response}->{randomAstro};
    if (length $astro != 12) {
      return $r;
    }
    $astro =~ /$reLoc/;
    my ($y, $x) = (split('',$+{region}));
    push @{ $queues[$x] }, $astro;

  }
  #$s->app->log->debug(Dumper(@queues));

  foreach my $q (@queues) {
    my @chain;
    my $last = $start;
    foreach my $next (@$q) {
      push @chain, {func => 'ctxMoveScout', 
        ctx => {origin => $last, destination => $next}};
      push @chain, {func => 'scanRegion', ctx => {region => $next}};
      $last = $next;
    }
    push @chain, {func => 'ctxMoveScout', 
      ctx => {origin => $last, destination => $start}};
    push @{$ret{chain}}, \@chain;

  }
  return \%ret;
}

sub orderRegions
{
  my ($s, $ctx) = @_;
  my $schema = $s->schema;

  my %r;
  $r{ctx} = $ctx;
  $ctx->{galaxy} =~ /^$reLoc$/;
  if (defined $+{galaxy}) {
    my $galaxy = $+{galaxy};
    my @rs = $schema->resultset('RegionStars')->search_like({ starLoc => $galaxy."%"})->all;

    if ($#rs < 0) {
      $r{command} = {func => 'getGalaxyXML', 
        ctx => {galaxy => $+{galaxy}}};
      return \%r;
    }

    my %regions = map { $_->starLoc =~ /:(\d+):/ && $1 => 1;  } @rs;
    my @regions = sort keys %regions;
    my @batch;
    foreach my $reg (@regions) {
      push @{ $r{batch} }, $s->randomAstro({ randomAstro => sprintf("%s:%s", $galaxy, $reg)});
    }
  #  $s->app->log->debug(Dumper(\%r));
  } else {
    $s->app->log->debug("wtf is this? ".Dumper($ctx));
  }
  return (\%r);
}

sub randomAstro
{
  my ($s, $ctx) = @_;
  my $schema = $s->schema;

  my %r;
  $r{ctx} = $ctx;
  $ctx->{randomAstro} =~ /^$reLoc$/;

  if (defined $+{galaxy} and defined $+{region}) {
#    $s->app->log->debug(sprintf("randomAstro %s:%s", $+{galaxy}, $+{region}));

#first pick from astro, then region stars
    my @rs = $schema->resultset('Astro')->search({
        -and => [
          location => { like => $+{loc}."%" },
          -or => [
            type => 'Planet',
            type => 'Moon',
            type => 'Asteroid',
          ],
        ],
      })->all;
    if ($#rs >= 0) {
      $r{response} = {randomAstro => $rs[int(rand($#rs + 1))]->location};
    } else {
# no dice?
      @rs = $schema->resultset('RegionStars')->search_like({ starLoc => $+{loc}."%"})->all;
      if ($#rs >= 0) {
        my $system = $rs[int(rand($#rs + 1))]->starLoc;
        $r{command} = {func => 'ctxQueueGet', 
          ctx => {url => "map.aspx?loc=$system", msg => "obtaining $system", follow => 0}
        };
      } else {
# not even in RegionStars? ask for the galaxy xml
        $s->app->log->debug("getGalaxy ".$+{loc});
        $r{command} = {func => 'getGalaxyXML', 
          ctx => {galaxy => $+{galaxy}}};
      }
    }

=pod 
      push @{ $r{batch} }, { command => 
        {func => 'ctxQueueGet', 
          ctx => {url => "map.aspx?loc=$system", msg => "obtaining $system"}
        } };
      push @{ $r{batch} }, { command => 
        {func => 'randomAstro',
          ctx => {randomAstro => $system}
        } };
=cut        
  } else {
    $s->app->log->debug("no randomAstro ?".Dumper($ctx));
  }
  return (\%r);
}

sub dispatchQuery 
{
  my $s = shift;

  $s->app->log->debug($s->req->body);
  my $data = $json->decode( $s->req->body );
  my $err  = $json->error;

  if ($json->error) {
    $s->stash(json => { error => $json->error });
    $s->render(status => 400);
    return;
  } 

  my ($server, $time, $playerID) = 
    map { $data->{$_}; } qw/server time playerID/;

  my $schema = $s->schema($server);
  my $dtServer = DateTime::Format::DateManip->parse_datetime(ParseDate($time));

  my $guildTag = '';
  my $dbPlayer = $schema->resultset('Player')->find($playerID);
  if (defined $dbPlayer) {
    $guildTag = $dbPlayer->guildTag;
  }

  my $r = {};
  if ($data->{func} eq 'scoutGalaxy') {
    $r = $s->scoutGalaxy($data->{ctx});
  }

  $s->stash(json => $r);
  $s->render(status => 200);

  $s->stash(json => $r);
  $s->render(status => 200);
}

1;
