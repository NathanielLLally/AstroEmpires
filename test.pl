#!/usr/bin/perl -w

use strict;
use astroEmpires qw/:all/;
use Data::Dumper;


my $ae = astroEmpires->new(
  server => 'http://bravo.astroempires.com',
#  user => 'nathaniel.lally@gmail.com',
  user => 'nate.lally@gmail.com',
  pass => 'aqsw@1#2'
);

$ae->login();
$ae->getStars("B39");
exit;

$ae->getFleet();

$ae->printFleetSummary;

print "server time: ".$ae->serverTime->strftime("%Y-%m-%d %I:%M:%S %p")."\n";
print "local time: ".$ae->localTimePretty."\n";


