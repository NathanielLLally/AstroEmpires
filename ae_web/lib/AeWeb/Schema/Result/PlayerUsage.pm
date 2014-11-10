use utf8;
package AeWeb::Schema::Result::PlayerUsage;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::PlayerUsage

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

=head1 TABLE: C<playerUsage>

=cut

__PACKAGE__->table("playerUsage");

=head1 ACCESSORS

=head2 id

  data_type: 'integer'
  is_nullable: 0

=head2 name

  data_type: 'varchar'
  is_nullable: 0
  size: 20

=head2 count

  data_type: 'integer'
  default_value: 1
  is_nullable: 1

=head2 last

  data_type: 'timestamp'
  datetime_undef_if_invalid: 1
  default_value: current_timestamp
  is_nullable: 0

=cut

__PACKAGE__->add_columns(
  "id",
  { data_type => "integer", is_nullable => 0 },
  "name",
  { data_type => "varchar", is_nullable => 0, size => 20 },
  "count",
  { data_type => "integer", default_value => 1, is_nullable => 1 },
  "last",
  {
    data_type => "timestamp",
    datetime_undef_if_invalid => 1,
    default_value => \"current_timestamp",
    is_nullable => 0,
  },
);

=head1 PRIMARY KEY

=over 4

=item * L</id>

=item * L</name>

=back

=cut

__PACKAGE__->set_primary_key("id", "name");


__PACKAGE__->belongs_to(
  "player",
  "AeWeb::Schema::Result::Player",
  { id => "id" },
  { is_deferrable => 1, on_delete => "CASCADE", on_update => "CASCADE" },
);

# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-08 22:37:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:AIAAQEc6IOKqjtNSnvnw3Q


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
