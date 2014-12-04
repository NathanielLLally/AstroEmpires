package AeWeb;
use Mojo::Base 'Mojolicious';

# This method will run once at server start
sub startup {
  my $s = shift;

  # Documentation browser under "/perldoc"
  $s->plugin('PODRenderer');
  my $conf = $s->plugin('Config');

  $s->secrets(['onetwothreefour']);
  $s->sessions->default_expiration(864000);
#  $s->types->type

# $s->hook(before_dispatch => sub {
#    push @{$self->req->url->base->path->parts}, splice @{$self->req->url->path->parts}, 0, 2;
#    my $s = shift;
#    shift @{$s->req->url->base->path->parts};
#    $s->app->log->debug( Dumper( $s->req->url->base->path->parts ) );
#  });



  # Router
  my $r = $s->routes;

  # Normal route to controller
  $r->any('/ae')->to(controller => 'main', action => 'index');
  $r->get('/ae/gis')->to('main#index');
  $r->get('/ae/gis/data/:proc')->to('Ajax::DBIx#dbic');
  $r->post('/ae/login')->to(controller => 'main', action => 'login');
  $r->post('/ae/updatePassword')->to(controller => 'main', action => 'updatePassword');
  $r->post('/ae/select/server')->to(controller => 'main', action => 'select');
  $r->any('/ae/logout')->to(controller => 'main', action => 'logout');
  $r->post('/ae/gis')->to(controller => 'store', action => 'dumpPostData');
  $r->post('/ae/gis/2')->to(controller => 'store', action => 'dumpPost');
  $r->post('/ae/gis/q')->to(controller => 'query', action => 'dispatchQuery');
  $r->post('/ae/gis/log')->to(controller => 'store', action => 'log');
}

1;
