#!/usr/bin/perl
use DBI;
use Data::Dumper;
use strict;
use warnings;

my $db = 'aeBravo';
my $dbh = DBI->connect_cached("DBI:mysql:database=$db;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1}) || die $DBI::errstr;
my ($sth, $rs);
  $sth = $dbh->table_info('', '', undef, "VIEW");
  $rs = $sth->fetchall_arrayref();
  my @views;
  foreach my $row (@$rs) {
    my $view = $row->[2];
    if ($view =~ /^v/) {
      $view =~ s/^v//;
      push @views, $view;
    }
  }

   print Dumper(\@views);
