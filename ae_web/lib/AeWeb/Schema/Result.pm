package AeWeb::Schema::Result;
use Data::Dumper;

use base 'DBIx::Class::Core';

__PACKAGE__->load_components(qw/
    FilterColumn
    InflateColumn::DateTime
        /);

our $Server = '';
our $reLoc = qr/(?<loc>(?<galaxy>[A-Za-z][0-9]{2}):?(?<region>[0-9]{2})?:?(?<system>[0-9]{2})?:?(?<astro>[0-9]{2})?)/;

sub to_href_map
{
  "<a target=\"_blank\" href=\"http://$AeWeb::Schema::Result::ServerURL/map.aspx?loc=".$_[1].'">'.$_[1].'</a>';
}

sub from_href_map
{
#  $_[1] =~ /$AeWeb::Schema::Result::reLoc/;
#  $+{loc};
  $_[1];
}

sub _dumper_hook {
    $_[0] = bless {
      %{ $_[0] },
      _source_handle=>undef,
      result_source => undef,
      }, ref($_[0]); 
}
$Data::Dumper::Freezer = '_dumper_hook';
1;
