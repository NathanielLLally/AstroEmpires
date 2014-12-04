use utf8;
package AeWeb::Schema;

# Created by DBIx::Class::Schema::Loader
# DO NOT MODIFY THE FIRST PART OF THIS FILE

use strict;
use warnings;

use base 'DBIx::Class::Schema';
#use DBIx::Connector;
#use DBIx::QueryByName::Logger;

__PACKAGE__->load_namespaces(
  result_namespace => 'Result',
  resultset_namespace => 'ResultSet',
  default_resultset_class => 'ResultSet',
);



=pod

my $dsn;
my $username;
my $password;
my %attr;
my %extr;

our  $schema = My::Schema->connect( sub {
    my $conn = DBI::Connector->new(
      $dsn, $username, $password, \%attr, \%extr);
    my $dbh = $conn->dbh;
    $conn->run( fixup => sub {
      my $log;
      &$_->($log = get_logger());
      });
    });

=cut

1;
