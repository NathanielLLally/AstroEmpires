package AeWeb::Controller::Sandbox;
use warnings;
use strict;
use lib './lib';
use AeWeb::Schema;
use AeWeb::DBcommon;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::JSON;
use URI::Escape;
use URI;
use DateTime;
use DBI;
use Try::Tiny;
use DateTime::Format::DateManip;
use Date::Manip;
use Data::Dumper;

use base 'AeWeb::DBcommon';

package main;

my $sb = new AeWeb::Controller::Sandbox();
my $dbh = $sb->dbh('bravo');
$dbh->do('drop database aeServer');
$sb->app->log->debug("dropping aeServer");

foreach my $db (qw/aeServer aePegasus aeDelta aeAndromeda/) {
  $sb->createOrUpdateDatabase($db);
}
