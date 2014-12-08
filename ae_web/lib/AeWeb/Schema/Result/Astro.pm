use utf8;
package AeWeb::Schema::Result::Astro;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::Astro

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

=head1 TABLE: C<astro>

=cut

__PACKAGE__->table("astro");

=head1 ACCESSORS

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

=head2 terrain

  data_type: 'varchar'
  is_nullable: 0
  size: 80

=head2 type

  data_type: 'varchar'
  is_nullable: 0
  size: 80

=cut

__PACKAGE__->add_columns(
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
  "terrain",
  { data_type => "varchar", is_nullable => 0, size => 80 },
  "type",
  { data_type => "varchar", is_nullable => 0, size => 80 },
);

=head1 PRIMARY KEY

=over 4

=item * L</location>

=item * L</guildTag>

=back

=cut

__PACKAGE__->set_primary_key("location", "guildTag");

__PACKAGE__->filter_column( location => {
    filter_from_storage => 'to_href_map',
    });

__PACKAGE__->might_have(
  "base",
  "AeWeb::Schema::Result::Base",
  { "foreign.location" => "self.location" },
  { cascade_copy => 0, cascade_delete => 0 },
);


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-12 12:58:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:by0OCUtWt3t+tabZjcbaqw


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
