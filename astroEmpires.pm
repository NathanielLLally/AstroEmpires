=head1 NAME

  astroEmpires

=head1 SYNOPSIS

  set of packages for web scraping the game astro empires


=head1 DESCRIPTION

  login to an astro empires server and determines fleet information based on areas a player can scout

  ae::Ship
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
use Date::Manip;

subtype 'ServerTime'
  => as 'Str';

coerce 'ServerTime'
  => from 'Str'
  => via { 
    ParseDate("$_ CET");
  };

subtype 'HeaderTime'
  => as 'Str';

coerce 'HeaderTime'
  => from 'Str'
  => via { 
    ParseDate($_);
  };

sub setServerTime
{
  my $s = shift;
  $s->serverTime($s->headerTime);
}

has 'headerTime' => (isa => 'HeaderTime', is => 'rw', 
    coerce => 1, trigger => \&setServerTime);

has 'serverTime' => (isa => 'ServerTime', is => 'rw', 
    coerce => 1, predicate => 'hasServerTime');

has 'localTime' => (isa => 'HeaderTime', is => 'rw', coerce => 1);

no Moose;
__PACKAGE__->meta->make_immutable;

package ae::Ship;
use Moose;
use Moose::Util::TypeConstraints;

our %ships = (
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
    'Outpost Ship' => 3,
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
  => where { exists $ae::Ship::ships{$_} };

has 'type' => (isa => 'ShipType', is => 'rw', required => 1);
has 'number' => (isa => 'Int', is => 'rw', required => 1);
has 'size' => (isa => 'Int', is => 'rw', lazy => 1, default => sub {
  my $s = shift;
  $ae::Ship::ships{$s->type} * $s->number;
});

no Moose;
__PACKAGE__->meta->make_immutable;


package ae::Fleet;
use Moose;
use Moose::Util::TypeConstraints;

extends 'ae::ServerTime';

subtype 'Ships'
  => as 'ae::Ship'
  => where { $_->isa('ae::Ship') };

coerce 'Ships'
  => from 'Str'
  => via {
    if ($_ =~ /(\w+\s?\w*?)\s+([\d,]+)/) {
      my $n = $2;
      $n =~ s/,//g;
      ae::Ship->new(type => $1, number => $n);
    }
  };

subtype 'Location'
  => as 'Str'
  => where { $_ =~ /^[ABCDEFGHI](\d\d:){3}(\d\d)$/ };

subtype 'SizeComma'
  => as 'Str'
  => where { $_ =~ /^[\d,]+$/ };

has 'name' => (isa => 'Str', is => 'rw');
has 'id' => (isa => 'Int', is => 'rw', required => 1);
has 'loc' => (isa => 'Location', is => 'rw', required => 1);
has 'destination' => (isa => 'Location', is => 'rw', predicate => 'hasDestination' );
has 'arrival' => (isa => 'HeaderTime', is => 'rw');
has 'size' => (isa => 'SizeComma', is => 'rw', lazy_build => 1);

has 'ships' => (
  isa => 'HashRef[Ships]',
  is => 'rw',
  coerce => 1,
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

has 'fleet' => (isa => 'HashRef[ae::Fleet]', is => 'rw',
  default => sub { {} } ,
  );

#sub fleet
#{
#  my ($s, @fleet) = @_;
#}

{
  my $i;
sub sendRequest
{
  my ($s, $req) = @_;
  open (OUT, ">out".++$i.".html") || die "cant open out";

  $s->ua()->cookie_jar()->add_cookie_header($req);
  print OUT "request:\n".$req->{_headers}->as_string();

  $s->res($s->ua()->request($req));

  if ($s->res()->is_success) {
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
    $s->headerTime($s->res->header('Date'));
    $s->headerTime($s->res->header('Client-Date'));
    print UnixDate($s->serverTime, "It is now %T on %b %e, %Y.");

    print OUT "\nresponse:\n".$s->res()->{_headers}->as_string();
    print OUT $s->res()->decoded_content;
  } elsif ($s->res()->code == 302) {
    print "redirect to ".$s->res()->request()->uri."\n";
    print OUT $s->res()->decoded_content;
    #sendRequest($s, $s->res()->request);
  } else {
    print $s->res()->status_line . "\n";
  }
  close(OUT);

}
}

sub getFleet
{
  my $s = shift;
  my ($uri, $req, $tree) = ($s->base, undef, undef); 
  $uri->path( 'fleet.aspx' );
  $req = HTTP::Request->new('GET', $uri);
  sendRequest($s,$req);

  open(FLEET, ">fleet.out");

  $tree = HTML::TreeBuilder->new_from_content( $s->res()->content() );

  my $table = $tree->look_down('id', 'fleets-list');
  my @tds = $table->look_down('_tag', 'td');

  my ($size, $id, $name, $loc, $dest, $time);
  map {
    if ($_->attr('id') =~ /time/) {
      $time = $_->attr('title');
      print FLEET "time: $time\n";
    } else {
      if ($_->as_text =~ /^[\d\,]+$/) {
        $size = $_->as_text;
        eval {
          my $fleet = ae::Fleet->new(
              name => $name, loc => $loc, id => $id, size => $size,
              destination => $dest, 
              );

          if ($time) {
            $fleet->arrival( DateCalc($s->serverTime, "+$time seconds") );
          }
          $s->fleet({%{$s->fleet}, $name => $fleet });
          ($name, $loc, $id, $size, $dest, $time) = ((undef) x 6);
        };
        print $@ if $@;
      }
    }

    my @hrefs = $_->look_down('_tag', 'a');
    map {
      print FLEET $_->attr('href')."]\n";
      if ($_->attr('href') =~ /fleet\.aspx\?fleet=(\d+)$/) {
        $id=$1;
        $name = $_->as_text;
      } elsif ($_->attr('href') =~ /map\.aspx\?loc=(\w\d\d:\d\d:\d\d:\d\d)$/) {
        if (defined $loc) {
          $dest = $1;
        } else {
          $loc = $1;
        }
#        $s->fleet(ae::Fleet->new( name => $name, loc => $loc, id => $fleet))
#        $s->addFleet(name => $name, loc => $loc, id => $fleet)
      }
    } @hrefs;
  } @tds;

  print FLEET Dumper($s->fleet);
#  $uri->query("fleet="
#  $req = HTTP::Request->new('GET', $uri);
#  sendRequest($s,$req);

  close (FLEET);

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
  return if ($s->isSessionValid);

  $req = HTTP::Request->new('GET', $uri);
  sendRequest($s,$req);

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
  sendRequest($s,$req);

  $uriHome->path('account.aspx');
  $req = HTTP::Request->new('GET', $uriHome);
  sendRequest($s,$req);
  
}

no Moose;
__PACKAGE__->meta->make_immutable;
1;

