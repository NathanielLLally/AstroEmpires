package AeWeb::Schema::ResultSet::Fleet;

use Moose;
use Hash::Flatten qw(:all);
use Mojo::Util qw/dumper/;
extends 'AeWeb::Schema::ResultSet';

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

around 'display' => sub {
  my $orig = shift;
  my $self = shift;

  #nooo way on syntax.. so much for all that glob wrangling
  my @data = $self->$orig();
#  die ref($data[1]);
  @data = map {
flatten($_) 
  } @{ $data[0] };
  return \@data;
};

1;
