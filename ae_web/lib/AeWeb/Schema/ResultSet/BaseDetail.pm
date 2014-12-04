package AeWeb::Schema::ResultSet::BaseDetail;

use Moose;
extends 'AeWeb::Schema::ResultSet';

sub hi
{
  my $s = shift;
  open(OUT, ">/tmp/out");
  print OUT "hi there\n";
  close OUT;
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
          {id => "latestDetail.id"},
          {mtime => { max => "latestDetail.time" }},
          ],
        group_by => ['id'],
        alias => 'latestDetail',
      }
      )->get_column('mtime')->as_query },
    });
}

1;
