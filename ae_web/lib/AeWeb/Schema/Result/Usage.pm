use utf8;
package AeWeb::Schema::Result::Usage;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::Usage

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

=head1 TABLE: C<usage>

=cut

__PACKAGE__->table("usage");

=head1 ACCESSORS

=head2 playerID

  accessor: 'player_id'
  data_type: 'integer'
  is_nullable: 0

=head2 name

  data_type: 'varchar'
  is_nullable: 0
  size: 20

=head2 count

  data_type: 'integer'
  is_nullable: 0

=head2 last

  data_type: 'datetime'
  datetime_undef_if_invalid: 1
  is_nullable: 0

=cut

__PACKAGE__->add_columns(
  "playerID",
  { accessor => "player_id", data_type => "integer", is_nullable => 0 },
  "name",
  { data_type => "varchar", is_nullable => 0, size => 20 },
  "count",
  { data_type => "integer", is_nullable => 0 },
  "last",
  {
    data_type => "datetime",
    datetime_undef_if_invalid => 1,
    is_nullable => 0,
  },
);

=head1 PRIMARY KEY

=over 4

=item * L</playerID>

=item * L</name>

=back

=cut

__PACKAGE__->set_primary_key("playerID", "name");


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-07 12:20:47
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:7aPYPaoE43g2g907egSL8Q


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
