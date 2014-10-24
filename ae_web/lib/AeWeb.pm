package AeWeb;
use Mojo::Base 'Mojolicious';
use Mango;
use Data::Dumper;

sub secret {
  my $s = shift;

}

# This method will run once at server start
sub startup {
  my $s = shift;

  # Documentation browser under "/perldoc"
  $s->plugin('PODRenderer');

 $s->hook(before_dispatch => sub {
#    push @{$self->req->url->base->path->parts}, splice @{$self->req->url->path->parts}, 0, 2;
    my $s = shift;
    shift @{$s->req->url->base->path->parts};
    $s->app->log->debug( Dumper( $s->req->url->base->path->parts ) );
  });

  my $conf = $s->plugin('Config');

  $s->secret('sol');
  $s->helper(mango => sub { state $mango = Mango->new(
    "mongodb://localhost/ae");});

  # Router
  my $r = $s->routes;

  # Normal route to controller
  $r->any('/ae')->to(controller => 'main', action => 'index');
  $r->any('images')->to('main#showImages');
  $r->any('/upload')->to('main#upload');
  $r->any('/upload/:name')->to('main#upload');
  $r->get('/ae/login')->to(controller => 'main', action => 'login');
  $r->post('/ae/gmDrop')->to(controller => 'main', action => 'dumpPostData');
  $r->get('/ae/gmDrop')->to(controller => 'example', action => 'welcome');

}

1;
