use utf8;
package AeWeb::Schema::Result::Log;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::Log

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

=head1 TABLE: C<log>

=cut

__PACKAGE__->table("log");

=head1 ACCESSORS

=head2 playerID

  data_type: 'integer'
  is_nullable: 0

=head2 id

  data_type: 'mediumint'
  is_nullable: 0

=head2 time

  data_type: 'timestamp'
  datetime_undef_if_invalid: 1
  default_value: current_timestamp
  is_nullable: 0

=head2 line

  data_type: 'text'
  is_nullable: 0

=cut

__PACKAGE__->add_columns(
  "playerID",
  { data_type => "integer", is_nullable => 0 },
  "id",
  { data_type => "mediumint", is_nullable => 0 },
  "time",
  {
    data_type => "timestamp",
    datetime_undef_if_invalid => 1,
    default_value => \"current_timestamp",
    is_nullable => 0,
  },
  "line",
  { data_type => "text", is_nullable => 0 },
);

=head1 PRIMARY KEY

=over 4

=item * L</playerID>

=item * L</id>

=back

=cut

__PACKAGE__->set_primary_key("playerID", "id");


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-19 12:08:43
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:5Ixf+OS0A0iWS5NuR88YsQ


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
