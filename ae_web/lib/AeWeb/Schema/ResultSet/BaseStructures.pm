package AeWeb::Schema::ResultSet::BaseStructures;

use Moose;
extends 'AeWeb::Schema::ResultSet';

sub list
{
  my $s = shift;
  $s->search(undef,
    {
      columns => [ qw/name/ ],
      distinct => 1
    });
}

sub latest
{
  my $s = shift;
  my $me = $s->current_source_alias;
  $s->search({
    "$me.time" => { '=' => $s->search(
      {
        "id" => { -ident => "$me.id" },
      },
      {
        columns => [
          {id => "latestStructure.id"},
          {mtime => { max => "latestStructure.time" }},
          ],
        group_by => ['id'],
        alias => 'latestStructre',
      }
      )->get_column('mtime')->as_query },
    });
}





1;
