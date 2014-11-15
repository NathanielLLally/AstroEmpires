use utf8;
package AeWeb::Schema::Result::FleetSize;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::FleetSize

=cut

use strict;
use warnings;

use base 'DBIx::Class::Core';

=head1 COMPONENTS LOADED

=over 4

=item * L<DBIx::Class::InflateColumn::DateTime>

=item * L<DBIx::Class::TimeStamp>

=back

=cut

__PACKAGE__->load_components("InflateColumn::DateTime", "TimeStamp");

=head1 TABLE: C<fleetSize>

=cut

__PACKAGE__->table("fleetSize");

=head1 ACCESSORS

=head2 location

  data_type: 'varchar'
  is_nullable: 0
  size: 12

=head2 size

  data_type: 'integer'
  default_value: 0
  is_nullable: 0

=head2 time

  data_type: 'datetime'
  datetime_undef_if_invalid: 1
  is_nullable: 0

=head2 guildTag

  data_type: 'varchar'
  default_value: (empty string)
  is_nullable: 0
  size: 9

=cut

__PACKAGE__->add_columns(
  "location",
  { data_type => "varchar", is_nullable => 0, size => 12 },
  "size",
  { data_type => "integer", default_value => 0, is_nullable => 0 },
  "time",
  {
    data_type => "datetime",
    datetime_undef_if_invalid => 1,
    is_nullable => 0,
  },
  "guildTag",
  { data_type => "varchar", default_value => "", is_nullable => 0, size => 9 },
);

=head1 PRIMARY KEY

=over 4

=item * L</location>

=item * L</guildTag>

=back

=cut

__PACKAGE__->set_primary_key("location", "guildTag");


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-12 12:58:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:VDApHaOpoICzyWSffQwONg


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
