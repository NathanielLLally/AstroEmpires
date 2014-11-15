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

my $reLoc = qr/(?<loc>(?<galaxy>[A-Za-z][0-9]{2}):(?<region>[0-9]{2}):?(?<system>[0-9]{2})?:?(?<astro>[0-9]{2})?)/;

my $json = Mojo::JSON->new;

sub randomStar
{
  my ($s, $schema, $data) = @_;

  my %r;
  if ($data =~ /^$reLoc$/) {
    my $system;
    if (defined $+{system}) {
      $system = $+{loc};
    } else {
      $s->app->log->debug("region ".$+{loc});
      my @rs = $schema->resultset('RegionStars')->search_like({ starLoc => $+{loc}."%"})->all;
      if ($#rs > 0) {
        $system = $rs[int(rand($#rs + 1))]->starLoc;
      } else {
        $r{command} = {func => 'getGalaxyXML', 
          ctx => {galaxy => $+{galaxy}}};
        return \%r;
      }
    }

    my @rs = $schema->resultset('Astro')->search_like({ location => "$system%"})->all;
    if ($#rs > 0) {
      $r{response} = {randomAstro => $rs[int(rand($#rs + 1))]->location};
    } else {
      $r{response} = {system => $system};
      $r{command} = {func => 'ctxQueueGet', 
        ctx => {url => "map.aspx?loc=$system", msg => "obtaining $system"}};
    }
      
  } else {
    $s->app->log->debug("wtf is this? ".$data);
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
  if (exists $data->{randomAstro}) {
    $r = $s->randomStar($schema, $data->{randomAstro});
  }

  $s->stash(json => $r);
  $s->render(status => 200);
}

1;
