use utf8;
package AeWeb::Schema::Result::Player;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

=head1 NAME

AeWeb::Schema::Result::Player

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

=head1 TABLE: C<player>

=cut

__PACKAGE__->table("player");

=head1 ACCESSORS

=head2 id

  data_type: 'integer'
  is_nullable: 0

=head2 name

  data_type: 'varchar'
  is_nullable: 0
  size: 80

=head2 level

  data_type: 'varchar'
  is_nullable: 1
  size: 7

=head2 upgraded

  data_type: 'varchar'
  is_nullable: 1
  size: 10

=head2 guildTag

  data_type: 'varchar'
  is_nullable: 1
  size: 9

=head2 defaultServer

  data_type: 'varchar'
  is_nullable: 1
  size: 80

=head2 password

  data_type: 'varchar'
  is_nullable: 1
  size: 80

=cut

__PACKAGE__->add_columns(
  "id",
  { data_type => "integer", is_nullable => 0 },
  "name",
  { data_type => "varchar", is_nullable => 0, size => 80 },
  "level",
  { data_type => "varchar", is_nullable => 1, size => 7 },
  "upgraded",
  { data_type => "varchar", is_nullable => 1, size => 10 },
  "guildTag",
  { data_type => "varchar", is_nullable => 1, size => 9 },
  "defaultServer",
  { data_type => "varchar", is_nullable => 1, size => 80 },
  "password",
  { data_type => "varchar", is_nullable => 1, size => 80 },
);

=head1 PRIMARY KEY

=over 4

=item * L</id>

=back

=cut

__PACKAGE__->set_primary_key("id");


=head1 RELATIONS

=head2 player_usage

Type: has_many

Related object: L<AeWeb::Schema::Result::PlayerUsage>

=cut

__PACKAGE__->has_many(
  "player_usage",
  "AeWeb::Schema::Result::Player_Usage",
  { "foreign.id" => "self.id" },
  { cascade_copy => 0, cascade_delete => 0 },
);


# Created by DBIx::Class::Schema::Loader v0.07042 @ 2014-11-12 12:58:11
# DO NOT MODIFY THIS OR ANYTHING ABOVE! md5sum:j96BjCqiurz3VWrh3+bJbQ


# You can replace this text with custom code or comments, and it will be preserved on regeneration
1;
