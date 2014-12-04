package AeWeb::Schema::ResultSet::Fleet;

use Moose;
use Hash::Flatten qw(:all);
use Mojo::Util qw/dumper/;
extends 'AeWeb::Schema::ResultSet';

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
