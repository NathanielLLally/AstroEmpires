use utf8;
package AeWeb::Schema::Result::RegionStars;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::RegionStars

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

=head1 TABLE: C<regionStars>

=cut

__PACKAGE__->table("regionStars");

=head1 ACCESSORS

=head2 starLoc

  data_type: 'varchar'
  is_nullable: 0
  size: 9

=cut

__PACKAGE__->add_columns(
  "starLoc",
  { data_type => "varchar", is_nullable => 0, size => 9 },
);

=head1 PRIMARY KEY

=over 4

=item * L</starLoc>

=back

=cut

__PACKAGE__->set_primary_key("starLoc");


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-12 12:58:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:8wvLQsrDTgySkn+zXrnNwQ


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
