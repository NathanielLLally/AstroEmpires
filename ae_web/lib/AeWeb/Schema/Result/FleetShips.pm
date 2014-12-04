use utf8;
package AeWeb::Schema::Result::FleetShips;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::FleetShips

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

=head1 TABLE: C<fleetShips>

=cut

__PACKAGE__->table("fleetShips");

=head1 ACCESSORS

=head2 id

  data_type: 'integer'
  is_foreign_key: 1
  is_nullable: 0

=head2 time

  data_type: 'datetime'
  datetime_undef_if_invalid: 1
  is_nullable: 1

=head2 name

  data_type: 'varchar'
  is_nullable: 0
  size: 20

=head2 number

  data_type: 'integer'
  is_nullable: 0

=head2 guildTag

  data_type: 'varchar'
  default_value: (empty string)
  is_nullable: 0
  size: 9

=cut

__PACKAGE__->add_columns(
  "id",
  { data_type => "integer", is_foreign_key => 1, is_nullable => 0 },
  "time",
  {
    data_type => "datetime",
    datetime_undef_if_invalid => 1,
    is_nullable => 1,
  },
  "name",
  { data_type => "varchar", is_nullable => 0, size => 20 },
  "number",
  { data_type => "integer", is_nullable => 0 },
  "guildTag",
  { data_type => "varchar", default_value => "", is_nullable => 0, size => 9 },
);

=head1 PRIMARY KEY

=over 4

=item * L</id>

=item * L</name>

=item * L</guildTag>

=back

=cut

__PACKAGE__->set_primary_key("id", "name", "guildTag");

=head1 RELATIONS

=head2 

Type: belongs_to

Related object: L<AeWeb::Schema::Result::Fleet>

=cut

__PACKAGE__->belongs_to(
  "fleet",
  "AeWeb::Schema::Result::Fleet",
  { id => "id" },
  { is_deferrable => 1, on_delete => "CASCADE", on_update => "CASCADE" },
);


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-12 12:58:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:rr0bewrvhzbTwek9WIPuhA


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
