package AeWeb;
use Mojo::Base 'Mojolicious';
use Data::Dumper;

sub secret {
  my $s = shift;

}

# This method will run once at server start
sub startup {
  my $s = shift;

  # Documentation browser under "/perldoc"
  $s->plugin('PODRenderer');
  my $conf = $s->plugin('Config');

#  $s->types->type

 $s->hook(before_dispatch => sub {
#    push @{$self->req->url->base->path->parts}, splice @{$self->req->url->path->parts}, 0, 2;
    my $s = shift;
    shift @{$s->req->url->base->path->parts};
    $s->app->log->debug( Dumper( $s->req->url->base->path->parts ) );
  });


  $s->secret('sol');

  # Router
  my $r = $s->routes;

  # Normal route to controller
  $r->any('/ae')->to(controller => 'main', action => 'index');
  $r->any('/ae/gis/displayView/:view')->to(controller => 'main', action => 'displayView');
  $r->any('/upload/:name')->to('main#upload');
  $r->get('/ae/login')->to(controller => 'main', action => 'login');
  $r->post('/ae/gis')->to(controller => 'main', action => 'dumpPostData');
  $r->get('/ae/gis')->to(controller => 'example', action => 'welcome');

}

1;
