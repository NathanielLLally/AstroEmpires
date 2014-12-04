package AeWeb::Schema::Result;
use Data::Dumper;

use base 'DBIx::Class::Core';

__PACKAGE__->load_components(qw/
    InflateColumn::DateTime
        /);

sub _dumper_hook {
    $_[0] = bless {
      %{ $_[0] },
      _source_handle=>undef,
      result_source => undef,
      }, ref($_[0]); 
}
$Data::Dumper::Freezer = '_dumper_hook';
1;
