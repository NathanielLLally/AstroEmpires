package AeWeb::Schema::ResultSet;

use strict;
use warnings;

use DBIx::Class::ResultClass::HashRefInflator;
#use DBIx::Class::ResultSet::WithMetaData;
use Moose;
extends 'DBIx::Class::ResultSet';

#__PACKAGE__->load_components('Helper::ResultSet');

sub BUILDARGS { $_[2] } # ::RS::new() expects my ($class, $rsrc, $args) = @_

sub rando {
  my ($rs) = @_;

  $rs->result_class('DBIx::Class::ResultClass::HashRefInflator');
  my @return = $rs->all;
  return \@return;
}

sub display {
  my ($rs) = @_;

  $rs->result_class('DBIx::Class::ResultClass::OrderedHashRefInflator');
  my @return = $rs->all;
  return \@return;
}

#  instruct Moose to not do away with DBIC's constructor
__PACKAGE__->meta->make_immutable(inline_constructor => 0);
1;
