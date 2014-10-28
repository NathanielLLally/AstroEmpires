=head1 NAME

  astroEmpires

=head1 SYNOPSIS

  set of packages for web scraping the game astro empires


=head1 DESCRIPTION

  login to an astro empires server and determines fleet information based on areas a player can scout

  ae::Ships
    facilitates determining fleet breakdown by size of individual ships

  ae::Fleet
    description of a fleet

  ae::ServerTime
    manages server time versus localtime

=head1 USAGE

my $ae = astroEmpires->new(
  server => 'http://fenix.astroempires.com',
  user => 'your@email',
  pass => 'password');

$ae->login();
$ae->getFleet();

print Dumper($ae->fleet);

=cut

package ae::ServerTime;
use Moose;
use Moose::Util::TypeConstraints;
use DateTime::Format::DateManip;
use Date::Manip;

subtype 'ServerTime'
  => as 'DateTime';

coerce 'ServerTime'
  => from 'Str'
  => via {
    DateTime::Format::DateManip->parse_datetime(ParseDate($_));
  };

subtype 'LocalTime'
  => as 'DateTime';

coerce 'LocalTime'
  => from 'Str'
  => via { 
    DateTime::Format::DateManip->parse_datetime(ParseDate($_));
  };

coerce 'LocalTime'
  => from 'ServerTime'
  => via {
    $_->clone->set_time_zone('America/New_York');
  };

sub setLocalTime
{
  my $s = shift;
#  $s->localTime($s->serverTime);
  $s->localTime("now");
}

has 'serverTime' => (isa => 'ServerTime', is => 'rw', 
    coerce => 1, predicate => 'hasServerTime', trigger => \&setLocalTime);

has 'localTime' => (isa => 'LocalTime', is => 'rw', coerce => 1);

sub localTimePretty
{
  $_[0]->localTime->strftime("%Y-%m-%d %I:%M:%S %p");
}

no Moose;
__PACKAGE__->meta->make_immutable;

package ae::Ships;
use Moose;
use Moose::Util::TypeConstraints;

our %typeSizes = (
    'Fighters' => 5,
    'Bombers' => 10,
    'Heavy Bombers' => 30,
    'Ion Bombers' => 60,
    'Corvette' => 20,
    'Recycler' => 30,
    'Destroyer' => 40,
    'Frigate' => 80,
    'Ion Frigate' => 120,
    'Scout Ship' => 40,
    'Outpost Ship' => 100,
    'Cruiser' => 200,
    'Carrier' => 400,
    'Heavy Cruiser' => 500,
    'Battleship' => 2000,
    'Fleet Carrier' => 2500,
    'Dreadnought' => 10000,
    'Titan' => 50000,
    'Leviathan' => 200000,
    'Death Star' => 500000
);

subtype 'ShipType'
  => as 'Str'
  => where { exists $typeSizes{$_} };

has 'shipType' => (isa => 'ShipType', is => 'rw', required => 1);
has 'count' => (isa => 'Int', is => 'rw', lazy => 1, default => 1);

sub size {
  my $s = shift;
  $typeSizes{$s->shipType} * $s->count;
}

#  class method accessor for exists typeSizes{$}
#
sub isShipType
{
  return (exists $typeSizes{$_[0]});
}

no Moose;
__PACKAGE__->meta->make_immutable;


package ae::Fleet;
use Moose;
use Moose::Util::TypeConstraints;

extends 'ae::ServerTime';

subtype 'Ships'
  => as 'ae::Ships'
  => where { $_->isa('ae::Ships') };

coerce 'Ships'
  => from 'Str'
  => via {
    if ($_ =~ /(\w+\s?\w*?)\s+([\d,]+)/) {
      my $n = $2;
      $n =~ s/,//g;
      ae::Ships->new(shipType => $1, count => $n);
    }
  };

subtype 'Location'
  => as 'Str'
  => where { $_ =~ /^[ABCDEFGHI](\d\d:){3}(\d\d)$/ };

subtype 'SizeComma'
  => as 'Str'
  => where { $_ =~ /^[\d,]+$/ };

has 'name' => (isa => 'Str', is => 'rw', required => 1);
has 'id' => (isa => 'Int', is => 'rw', required => 1);
has 'location' => (isa => 'Location', is => 'rw', lazy => 1, default => sub {});
has 'destination' => (isa => 'Location', is => 'rw', predicate => 'hasDestination', lazy => 1, default => sub {} );
has 'arrival' => (isa => 'DateTime', is => 'rw', lazy => 1, default => sub {});
has 'size' => (isa => 'Int', is => 'rw', lazy => 1, default => 0);
has 'comment' => (isa => 'Str', is => 'rw', lazy => 1, default => '');

has 'ship' => (
  isa => 'HashRef[Ships]',
  is => 'rw',
  );

has 'ship' => (
  traits  => ['Hash'],
  is      => 'rw',
  isa     => 'HashRef[ae::Ships]',
  default => sub { {} },
  handles => {
    ship_type_count  => 'count',
    ship_types     => 'keys',
    ships        => 'values',
    get_ship     => 'get',
    set_ship     => 'set',
  },
  );

no Moose;
__PACKAGE__->meta->make_immutable;

package astroEmpires;

use Moose;
use Moose::Util::TypeConstraints;
use LWP;
use DBI;
use HTTP::Request;
use HTTP::Cookies;
use URI;
use HTML::TreeBuilder;
use Tie::IxHash;
use Symbol qw/geniosym/;
use Date::Manip;
use Carp;
use Try::Tiny;
use Storable;
use List::Util qw(first max maxstr min minstr reduce shuffle sum);
use XML::Simple;
use Data::Dumper;


use Exporter;
our @ISA = 'Exporter';
our @EXPORT_OK = qw/*DEBUG *LOG/;
our %EXPORT_TAGS = (all => [@EXPORT_OK]);

extends 'ae::ServerTime';

has 'user' => (isa => 'Str', is => 'rw', required => 1);
has 'pass' => (isa => 'Str', is => 'rw', required => 1);

subtype 'Uri'
      => as 'Object'
      => where { $_->isa('URI') };
  
  coerce 'Uri'
      => from 'Object'
          => via { $_->isa('URI') 
                    ? $_ 
                    : Params::Coerce::coerce( 'URI', $_ ) }
      => from 'Str'
          => via { 
            my $u = URI->new( $_ );
            $u->scheme('http');
            $u;
            };

has 'server' => (isa => 'Uri', is => 'rw', coerce => 1, 
  default => 'helion.astroempires.com'); 

has 'base' => (isa => 'Uri', is => 'rw', coerce => 1, 
  lazy => 1, default => sub { $_[0]->server() });

has 'uri' => (isa => 'Uri', is => 'rw', coerce => 1);

has 'dbh' => (isa => 'Object', is => 'rw'
  );

has 'ua' => (isa => 'Object', is => 'rw',
  lazy =>1, default => sub {
    my $ua = LWP::UserAgent->new();
    my $cj = HTTP::Cookies->new(
      file => 'cookies.txt',
      autosave => 1,
      );
    $ua->cookie_jar($cj);
    $ua->agent('Mozilla/5.0 (Windows; U; Windows NT 6.1; en-US; rv:1.9.1.9) Gecko/20100315 Firefox/3.5.9');
    $ua;
  });

has 'res' => (isa => 'Object', is => 'rw');

has 'fleet' => (
  traits  => ['Hash'],
  is      => 'rw',
  isa     => 'HashRef[ae::Fleet]',
  default => sub { {} },
  handles => {
    fleets_count  => 'count',
    fleet_ids     => 'keys',
    fleets        => 'values',
    get_fleet     => 'get',
    set_fleet     => 'set',
  },
  );

sub printFleetSummary
{
  my $s = shift;
  my %totals;
  print "Fleet Summary:\n";
  printf "id\tname\tsize\tlocation\tdestination\tarrival\n";
  foreach my $fleet ($s->fleets) {
    printf "%s\t%s\t\t\t%s\t%s\t%s\n",
      $fleet->id, $fleet->name, $fleet->size,
      ($fleet->hasDestination)?$fleet->destination:'',
      ($fleet->hasDestination)?$fleet->arrival->strftime("%Y-%m-%d %I:%M:%S %p"):'';
    foreach my $ship ($fleet->ships) {

      $totals{$ship->shipType}->{count} += $ship->count;
      $totals{$ship->shipType}->{size} += $ship->size;
      $totals{"{All Ships}"}->{size} += $ship->size;
      $totals{"{All Ships}"}->{count} += $ship->count;
      printf "\t%s\t%u\t%u\n", $ship->shipType, $ship->count, $ship->size;
    }
    print "\n";
  }

  print "\nTotals:\n";

  foreach my $st (sort keys %totals) {
    printf "\t%s\t%u\t%u\n", $st, $totals{$st}->{count}, $totals{$st}->{size};
  }
}

{
  my $i;
sub sendRequest
{
  my ($s, $req, $bypassAuthCheck) = @_;

  croak "invalid session" unless ($s->isSessionValid or defined $bypassAuthCheck);

  my $outfile = $req->uri->path;
  $outfile =~ s/\///g;
  open (OUT, ">".++$i."_$outfile") || die "cant open out";

  $s->ua()->cookie_jar()->add_cookie_header($req);
#  print OUT "request:\n".$req->{_headers}->as_string();

  $s->res($s->ua()->request($req));

  if ($s->res()->is_success) {
    #
    #  extrapolate session header and explicitly set
    #
    my $sesh = $s->res()->header('Set-Cookie');
    if (defined $sesh and $sesh =~ /HttpOnly/i) {
      $sesh =~ s/;? ?HttpOnly//;
      my ($key, $val);
      while ($sesh =~ /^(.*?)=(.*?);/gc) {
        ($key, $val) = ($1, $2);
        if ($1=~/session/i) {
          $s->ua()->cookie_jar()->set_cookie( 0, $key, $val, '/', $s->base->host, undef, 1, 0, 3600, 0);
          $s->ua()->cookie_jar()->save();
        }
      }
      #$s->res()->header('Set-Cookie' => $sesh);
      #$s->ua()->cookie_jar()->extract_cookies($s->res());

    }
    $s->serverTime($s->res->header('Date'));
#    $s->serverTime($s->res->header('Client-Date'));
#    print UnixDate($s->localTime, "localtime %Y-%m-%d %T %i:%M:%S %p");

#    print OUT "\nresponse:\n".$s->res()->{_headers}->as_string();
    print OUT $s->res()->decoded_content;

  } elsif ($s->res()->code == 302) {
    print "redirect to ".$s->res()->request()->uri."\n";
    print OUT $s->res()->decoded_content;
    #sendRequest($s, $s->res()->request);
  } else {
    print $s->res()->status_line . "\n";
  }
  close(OUT);
  return $s->res()->is_success;
}
}

sub getStars
{
  my $s = shift;
  my $galaxy = shift;
  my $file = ".aeStars.$galaxy.sto";
  my $num = $galaxy;
  $num =~ s/.*?(\d+)/$1/;
  my $stars;
  try {
    $stars = retrieve($file);
  };

  
  my ($uri, $req, $tree) = ($s->base, undef, undef); 
  $uri->path( "galaxies_xml/Bravo-$num.xml" );
  $req = HTTP::Request->new('GET', $uri);
  $s->sendRequest($req);
  my $xml = XMLin($s->res->decoded_content);

  foreach my $region (keys %{ $xml->{region} }) {
    foreach my $star (split(/;/, $xml->{region}->{$region}->{stars})) {
      if ($star =~ /(\d+)\w/) {
        push @$stars, "$galaxy:$region:$1";
      }
    }
  }

  my $sector = shift @$stars;
  $sector = "B39:86:33";
  $uri->path_query( "map.aspx?loc=$sector" );
  $req = HTTP::Request->new('GET', $uri);
  $s->sendRequest($req);
}

sub getFleetDetail
{
  my $s = shift;
  my $Pid = shift;
  my ($uri, $req, $tree) = ($s->base, undef, undef); 
  $uri->path_query( "fleet.aspx?fleet=$Pid" );
  $req = HTTP::Request->new('GET', $uri);
  $s->sendRequest($req);

  $tree = HTML::TreeBuilder->new_from_content( $s->res()->decoded_content() );

  my $section = $tree->look_down('id', 'fleet_overview');
  croak "no fleet overview from ".$uri->as_string unless (defined $section);

  my $fleetSize = 0;
  if ($section->as_text =~ /Fleet Size:\s?(\d+)/) {
    $fleetSize = $1;
  }

  #  Overview
  #     Units
  #     ShipType  Count
  #     Fleet Size: #
  #
  my @elTR = $section->look_down('_tag', 'tr');
  foreach my $row (@elTR) {
    my ($shipType, $count) = (undef, 0);
    my @elTD = $row->look_down('_tag', 'td');
    foreach my $elTD (@elTD) {
      if (ae::Ships::isShipType($elTD->as_text)) {
        $shipType = $elTD->as_text;
      } elsif (defined $shipType and $elTD->as_text =~ /(\d+)/) {
        $s->get_fleet($Pid)->set_ship(
          $shipType => ae::Ships->new(
            shipType => $shipType,
            count => $1
            ));
      }
    }
  }
}

sub getFleet
{
  my $s = shift;
  my ($uri, $req, $tree) = ($s->base, undef, undef); 
  $uri->path( 'fleet.aspx' );
  $req = HTTP::Request->new('GET', $uri);
  $s->sendRequest($req);

  $tree = HTML::TreeBuilder->new_from_content( $s->res()->decoded_content() );

  my $section = $tree->look_down('id', 'fleets-list');
  croak "no section with id=fleets-list in ".$uri->as_string unless (defined $section);

  my @elTR = $section->look_down('_tag', 'tr');

TR:  foreach my $elTR (@elTR) {
       my ($fleet, $elA, $itTD) = ((undef) x 3);
       my @elTD = $elTR->look_down('_tag', 'td');

#Fleet
       $itTD = shift @elTD;
       next TR unless (defined $itTD);
       $elA = $itTD->look_down('_tag', 'a');
       if (defined $elA and $elA->attr('href') =~ /fleet\.aspx\?fleet=(\d+)$/) {
         $fleet = ae::Fleet->new( name => $elA->as_text, id => $1 );
       }
       next TR unless (defined $fleet);

#Location
       $itTD = shift @elTD;
       next TR unless (defined $itTD);
       $elA = $itTD->look_down('_tag', 'a');
       if (defined $elA and $elA->attr('href') =~ /map\.aspx\?loc=(\w\d\d:\d\d:\d\d:\d\d)$/) {
         $fleet->location($1);
       }

#Destination
       $itTD = shift @elTD;
       next TR unless (defined $itTD);
       $elA = $itTD->look_down('_tag', 'a');
       if (defined $elA and $elA->attr('href') =~ /map\.aspx\?loc=(\w\d\d:\d\d:\d\d:\d\d)$/) {
         $fleet->destination($1);
       }

#Arrival
       $itTD = shift @elTD;
       next TR unless (defined $itTD);
       if (defined $itTD->attr('id') and $itTD->attr('id') =~ /time/) {
         $fleet->arrival(
          $s->localTime->clone->add( seconds => $itTD->attr('title'))
          );
       }

#Size
       $itTD = shift @elTD;
       next TR unless (defined $itTD);
       $fleet->size($itTD->as_text);

#Comment
       $itTD = shift @elTD;
       next TR unless (defined $itTD);

       if (length($itTD->as_text) > 0) {
         $fleet->comment($itTD->as_text);
       }

       $s->set_fleet($fleet->id => $fleet);

       $s->getFleetDetail($fleet->id);

     }
}

sub isSessionValid
{
  my $s = shift;
  my $jar = $s->ua->cookie_jar->as_string; 
  if ($jar =~ /ASP\.NET_SessionId/) {
    1;
  }
}

sub login
{
  my $s = shift;
  my $req;
  my $uri = $s->base;
  my $uriHome = $s->base;

  #  if we have an un-expired session, no need
  #
#  return if ($s->isSessionValid);

  $req = HTTP::Request->new('GET', $uri);

  $s->sendRequest($req, 1);

  $uri->path( 'login.aspx' );

  $req = HTTP::Request->new('POST', $uri,
   ['Content-Type' => 'application/x-www-form-urlencoded',
    'Accept-Encoding' => 'gzip, deflate',
    'Content' => $uri->query()
   ]
  );
  $uri->query_form( 
    href => $s->server(),
    email => $s->user(),
    pass => $s->pass(),
    hostname => $s->server(),
    javascript => 'true',
    navigator => 'Netscape',
    post_back => 'true',
    );
  $req->content($uri->query());
  $s->sendRequest($req, 1);

  $uriHome->path('account.aspx');
  $req = HTTP::Request->new('GET', $uriHome);
  $s->sendRequest($req);
  
}

no Moose;
__PACKAGE__->meta->make_immutable;
1;

