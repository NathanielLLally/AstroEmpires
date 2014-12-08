package AeWeb::Schema::ResultSet::BaseDetail;

use Moose;
extends 'AeWeb::Schema::ResultSet';

sub with_occupier_income
{
  my $s = shift;
  my $me = $s->current_source_alias;
  $s->search({
  }, {
    '+columns' => [
        ( { 'occupierIncome' => \" (baseDetail.economy * (0.01 * baseDetail.ownerIncome)) as occupierIncome" },
        ),
    ],
    alias => 'baseDetail',
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
          {id => "latestDetail.id"},
          {mdtime => { max => "latestDetail.time" }},
          ],
        group_by => ['id'],
        alias => 'latestDetail',
      }
      )->get_column('mdtime')->as_query },
    });
}

1;
