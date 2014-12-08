use utf8;
package AeWeb::Schema::Result::Base;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::Base

=cut

use strict;
use warnings;
use base 'AeWeb::Schema::Result';

=head1 COMPONENTS LOADED

=over 4

=item * L<DBIx::Class::InflateColumn::DateTime>

=item * L<DBIx::Class::TimeStamp>

=back

=cut

__PACKAGE__->load_components('FilterColumn', "InflateColumn::DateTime", "TimeStamp");

=head1 TABLE: C<base>

=cut

__PACKAGE__->table("base");

=head1 ACCESSORS

=head2 id

  data_type: 'integer'
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

=head2 location

  data_type: 'varchar'
  is_nullable: 0
  size: 12

=head2 owner

  data_type: 'integer'
  is_nullable: 0

=head2 occupier

  data_type: 'integer'
  is_nullable: 1

=cut

__PACKAGE__->add_columns(
  "id",
  { data_type => "integer", is_nullable => 0 },
  "time",
  {
    data_type => "datetime",
    datetime_undef_if_invalid => 1,
    is_nullable => 0,
  },
  "guildTag",
  { data_type => "varchar", default_value => "", is_nullable => 0, size => 9 },
  "location",
  { data_type => "varchar", is_nullable => 0, size => 12 },
  "owner",
  { data_type => "integer", is_nullable => 0 },
  "occupier",
  { data_type => "integer", is_nullable => 1 },
);

=head1 PRIMARY KEY

=over 4

=item * L</id>

=item * L</guildTag>

=back

=cut

__PACKAGE__->set_primary_key("id", "guildTag");

=head2 base_details

Type: has_many

Related object: L<AeWeb::Schema::Result::BaseDetail>

=cut

__PACKAGE__->has_one(
  "owner",
  "AeWeb::Schema::Result::Player",
  { "foreign.id" => "self.owner" },
  { cascade_copy => 0, cascade_delete => 0 },
);

__PACKAGE__->might_have(
  "occupier",
  "AeWeb::Schema::Result::Player",
  { "foreign.id" => "self.occupier" },
  { cascade_copy => 0, cascade_delete => 0 },
);


__PACKAGE__->might_have(
  "baseDetail",
  "AeWeb::Schema::Result::BaseDetail",
  { "foreign.id" => "self.id" },
#  , 'foreign.guildTag' => 'self.guildTag' },
  { cascade_copy => 0, cascade_delete => 0 },
);


=head2 base_structures

Type: has_many

Related object: L<AeWeb::Schema::Result::BaseStructures>

=cut

__PACKAGE__->has_many(
  "baseStructures",
  "AeWeb::Schema::Result::BaseStructures",
  { "foreign.id" => "self.id" },
  { cascade_copy => 0, cascade_delete => 0 },
);

__PACKAGE__->filter_column( location => {
    filter_from_storage => 'to_href_map',
    });

=head1 RELATIONS


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-12 12:58:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:NNAZF5lERIR72Hz56Gbddg


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
