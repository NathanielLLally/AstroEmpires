use utf8;
package AeWeb::Schema::Result::BaseStructure;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::BaseStructure

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

=head1 TABLE: C<baseStructures>

=cut

__PACKAGE__->table("baseStructures");

=head1 ACCESSORS

=head2 time

  data_type: 'datetime'
  datetime_undef_if_invalid: 1
  is_nullable: 0

=head2 guildTag

  accessor: 'guildTag'
  data_type: 'varchar'
  is_nullable: 1
  size: 9

=head2 id

  data_type: 'integer'
  is_foreign_key: 1
  is_nullable: 0

=head2 name

  data_type: 'varchar'
  is_nullable: 0
  size: 20

=head2 number

  data_type: 'integer'
  is_nullable: 0

=cut

__PACKAGE__->add_columns(
  "time",
  {
    data_type => "datetime",
    datetime_undef_if_invalid => 1,
    is_nullable => 0,
  },
  "guildTag",
  {
    data_type => "varchar",
    is_nullable => 1,
    size => 9,
  },
  "id",
  { data_type => "integer", is_foreign_key => 1, is_nullable => 0 },
  "name",
  { data_type => "varchar", is_nullable => 0, size => 20 },
  "number",
  { data_type => "integer", is_nullable => 0 },
);

=head1 PRIMARY KEY

=over 4

=item * L</id>

=item * L</name>

=back

=cut

__PACKAGE__->set_primary_key("id", "name");

=head1 RELATIONS

=head2 

Type: belongs_to

Related object: L<AeWeb::Schema::Result::Base>

=cut

__PACKAGE__->belongs_to(
  "base",
  "AeWeb::Schema::Result::Base",
  { id => "id" },
  { is_deferrable => 1, on_delete => "CASCADE", on_update => "CASCADE" },
);


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-07 16:36:54
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:K3+PG7uJOyQHLpiBt8m5cw


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
