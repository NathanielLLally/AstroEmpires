#!/usr/bin/perl
use warnings;
use strict;
use lib './lib';
use AeWeb::Schema;
use Data::Dumper;


my $schema = AeWeb::Schema->connect('dbi:mysql:aeBravo', 'ae', 'q1w2e3r4');
 $schema->storage->debugfh(IO::File->new('/tmp/trace2.out', 'w'));
 $schema->storage->debug(1);                          
my $player = $schema->resultset('Player')->find(7151);
print $player->name, " [",$player->guildTag,"]\n";

#*{ $col }{CODE}
my %row = $player->get_columns;
no strict 'refs';
foreach my $col (grep { exists $row{$_} } $player->result_source->columns) {
#  my $ref = *{ $col }{CODE};
#  my $ref = *{ 'AeWeb::Schema::Result::Player::'.$col}{CODE};
#  print "$col => ". $ref->($player);
  print "$col => ". $player->get_column($col).", ";
}
print "\n";


my $rs = $schema->resultset('Fleet')->search({ }, {prefetch => 'ships'});

my $fleet = $rs->next;
%row = $fleet->get_columns;
print Dumper(\%row)."\n";
exit;
no warnings;
print join("\t", sort grep { exists $row{$_} } $fleet->result_source->columns )."\n";
do 
{
  print join("\t", map { $fleet->get_column($_) }sort keys %row)."\n";
} while ($fleet = $rs->next);
exit;
printf ("[%s] %s - %s\n",$fleet->owner, $fleet->guildTag, $fleet->size);

#$fleet->delete;
#$fleet = undef;

if (not defined $fleet) {
my  $fleet = $schema->resultset('Fleet')->create({
      id => 3,
      location => 'B39:11:10:10',
      time => '2014/11/7 10:10:10',
      size => 440,
      owner => 7151,
      guildTag => 'SoL'
      });
  $fleet->create_related('ships',{ name => 'Cruiser', number => 2 });
  $fleet->create_related('ships',{ name => 'Fighter', number => 8 });
}

#printf ("[%s] %s - %s\n",$fleet->owner, $fleet->guild_tag, $fleet->size);

#$fleet->update;

