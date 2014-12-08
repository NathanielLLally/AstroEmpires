use utf8;
package AeWeb::Schema::Result::Fleet;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::Fleet

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

__PACKAGE__->load_components('FilterColumn', "InflateColumn::DateTime", "TimeStamp");

=head1 TABLE: C<fleet>

=cut

__PACKAGE__->table("fleet");

=head1 ACCESSORS

=head2 id

  data_type: 'integer'
  is_nullable: 0

=head2 location

  data_type: 'varchar'
  is_nullable: 0
  size: 12

=head2 size

  data_type: 'integer'
  is_nullable: 0

=head2 time

  data_type: 'datetime'
  datetime_undef_if_invalid: 1
  is_nullable: 0

=head2 owner

  data_type: 'integer'
  is_nullable: 0

=head2 name

  data_type: 'varchar'
  is_nullable: 1
  size: 20

=head2 origin

  data_type: 'varchar'
  is_nullable: 1
  size: 12

=head2 arrival

  data_type: 'datetime'
  datetime_undef_if_invalid: 1
  is_nullable: 1

=head2 guildTag

  data_type: 'varchar'
  default_value: (empty string)
  is_nullable: 0
  size: 9

=cut

__PACKAGE__->add_columns(
  "id",
  { data_type => "integer", is_nullable => 0 },
  "location",
  { data_type => "varchar", is_nullable => 0, size => 12 },
  "size",
  { data_type => "integer", is_nullable => 0 },
  "time",
  {
    data_type => "datetime",
    datetime_undef_if_invalid => 1,
    is_nullable => 0,
  },
  "owner",
  { data_type => "integer", is_nullable => 0 },
  "name",
  { data_type => "varchar", is_nullable => 1, size => 20 },
  "origin",
  { data_type => "varchar", is_nullable => 1, size => 12 },
  "arrival",
  {
    data_type => "datetime",
    datetime_undef_if_invalid => 1,
    is_nullable => 1,
  },
  "guildTag",
  { data_type => "varchar", default_value => "", is_nullable => 0, size => 9 },
);

=head1 PRIMARY KEY

=over 4

=item * L</id>

=item * L</guildTag>

=back

=cut

__PACKAGE__->set_primary_key("id", "guildTag");

=head1 RELATIONS

=head2 fleet_ships

Type: has_many

Related object: L<AeWeb::Schema::Result::FleetShips>

=cut

__PACKAGE__->has_many(
  "fleetShips",
  "AeWeb::Schema::Result::FleetShips",
  { "foreign.id" => "self.id" },
  { cascade_copy => 0, cascade_delete => 0 },
);

__PACKAGE__->has_one(
  "owner",
  "AeWeb::Schema::Result::Player",
  { "foreign.id" => "self.owner" },
  { cascade_copy => 0, cascade_delete => 0 },
);

__PACKAGE__->filter_column( location => {
    filter_from_storage => 'to_href_map',
    });


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-12 12:58:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:4Dazc7U6mrG3KZPp2N/4aw


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
