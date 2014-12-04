package AeWeb::Schema::ResultSet::Base;

use Moose;
use Hash::Flatten qw(:all);
use Mojo::Util qw/dumper/;
extends 'AeWeb::Schema::ResultSet';

__PACKAGE__->load_components(qw/
  Helper::ResultSet::CorrelateRelationship
  Helper::ResultSet::SearchOr
  /);

sub out
{
  my $s = shift;
  open(OUT, ">>/tmp/out");
  print OUT join("\n",@_,"\n");
  close OUT;
}

sub strip
{
  my $s = shift;
  $s->search(undef,{
    columns => [(
         grep { $_ !~ /^(owner|occupier|id|guildTag)$/ }
         $s->result_source->columns
        )],
    });
}

sub with_owner 
{
  my $s = shift;
  $s->search(undef, {
    join => ['owner'],
    '+columns' => [
      {"ownerTag" => "owner.guildTag"},
      { "owner" => "owner.name" },
      {"ownerLevel" => "owner.level" },
      ]
  });
}

sub with_occupier
{
  my $s = shift;
  $s->search(undef, {
    join => ['occupier'],
    '+columns' => [
      {"occupierTag" => "occupier.guildTag"},
      { "occupier" => "occupier.name" },
    ],
  });
}

sub with_detail_time
{
  my $s = shift;
  $s->search(undef, {
    '+columns' => {
      latest_detail => $s->correlate('baseDetail')->get_column('time')->max_rs->as_query
    }
  });
}

sub with_detail
{
  my $s = shift;

#
# alias works on
# $rel = 'baseDetail'
# $source = $self->result_source
# $source->related_source($rel)->resultset
#

  $s->search({
      'baseDetail.time' => { '=' => $s->correlate('baseDetail')->get_column('time')->max_rs->as_query
      },
    },
    {
      join => ['baseDetail'],
        '+columns' => [
          (map
           { +{ "$_" => "baseDetail.$_" } }
           grep { $_ !~ /^(id|guildTag|time)$/ }
           $s->related_resultset('baseDetail')->result_source->columns
          )],
    });
}

sub with_defenses
{
  my $s = shift;
  $s->pivot_structures('');
}

sub pivot_structures
{
  my $s = shift;
  my @name = @_;
  if (ref($name[0]) eq 'ARRAY') {
    @name = @{ $name[0] };
  }
  $s->search({
      -or => [
          (map { +{ 'baseStructures.name' => "$_" } } @name)
        ]
    },{
      join => [qw/baseStructures/],
      '+columns' => [
        (map { +{ "$_" => \[ 'IF (baseStructures.name = ?, baseStructures.number, NULL)', $_ ] } } @name)
      ],
    });
}

sub with_structures
{
  my $s = shift;
  $s->search({
      'baseStructures.time' => { '=' => $s->correlate('baseStructures')->get_column('time')->max_rs->as_query },
  },{
    join => [qw/baseStructures/],
    '+columns' => [
    { 'bsName' => "baseStructures.name" },
    { 'bsNum' => "baseStructures.number" },
    ],
  });
}

sub latest
{
  my $s = shift;
  $s->search({
    $s->current_source_alias . '.time' => { '=' => $s->search(
      {
        id => { -ident => $s->current_source_alias . '.id' },
      },
      {
        columns  => [ { 
          mtime => { max => 'time' },
            id => 'id',
          } ],
        group_by  => ['id'],
        alias => 'latestBase'
      })->get_column('mtime')->as_query },
    });
}

around 'display' => sub {
  my $orig = shift;
  my $self = shift;

  #nooo way on syntax.. so much for all that glob wrangling
  my @data = $self->$orig();
#  die ref($data[1]);
#
  

  @data = map {
flatten($_) 
  } @{ $data[0] };
  return \@data;
};

1;
