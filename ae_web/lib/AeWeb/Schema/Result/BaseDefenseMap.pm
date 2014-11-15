use utf8;
package AeWeb::Schema::Result::BaseDefenseMap;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::BaseDefenseMap

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

=head1 TABLE: C<baseDefenseMap>

=cut

__PACKAGE__->table("baseDefenseMap");

=head1 ACCESSORS

=head2 level

  data_type: 'integer'
  default_value: 0
  is_nullable: 0

=head2 name

  data_type: 'varchar'
  default_value: (empty string)
  is_nullable: 0
  size: 20

=cut

__PACKAGE__->add_columns(
  "level",
  { data_type => "integer", default_value => 0, is_nullable => 0 },
  "name",
  { data_type => "varchar", default_value => "", is_nullable => 0, size => 20 },
);

=head1 PRIMARY KEY

=over 4

=item * L</level>

=item * L</name>

=back

=cut

__PACKAGE__->set_primary_key("level", "name");


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-12 12:58:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:CAMyGWajeHedyzKHmIDThQ


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
