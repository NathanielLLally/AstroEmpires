package AeWeb::Controller::Main;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::JSON;
use Mojo::IOLoop;
use Data::Dumper;
use URI::Escape;
use Try::Tiny;
use MIME::Base64 qw/encode_base64 decode_base64 decode_base64url encode_base64url/;
use URI;
use Mango::BSON qw/:bson/;
use DateTime;
use Data::Dumper;

sub index {
  my $s = shift;
  $s->render;
}

sub dumpPostData {
  my $s = shift;

  $s->app->log->debug($s->req->body);

  my $json = Mojo::JSON->new;

  my $aeData = $json->decode( $s->req->body );
  my $err  = $json->error;

  
  if ($json->error) {
    $s->stash(data => "JSON Error: ".$json->error);

    $s->render(json => { status => 206,error => $json->error });
  } else {
    $s->app->log->debug('rendering json response');
    $s->stash(data => "why is the HTML template being used?");

    $s->render(json => { status => 200, test => 'ing' });
  }
}

sub login {
  my $s = shift;
  
  $s->app->log->debug("routed to login correctly");
  foreach my $name ($s->req->param) {
    $s->app->log->debug("$name => ".$s->req->param($name));
  }
  $s->render;
}

sub showImages {
  my $s = shift;
  my $coll = $s->mango->db->collection('images');

  my $return = 0;
  my $delay = Mojo::IOLoop->delay( sub {
      my ($delay, @docs) = @_;
      $s->app->log->debug("delay: $delay @docs");
#      $s->app->log->debug(Dumper(\@docs));
#      $s->stash(images => [qw(1 2 3 4 5)]);
#
#      xlate BSON
#
      foreach my $img (@docs) {
        if ($img->{src} !~ /^data/) {
          my $u = URI->new("data:");
          $u->media_type($img->{type});
          $u->data($img->{src});
          $img->{src} = $u;
        }
      }
      $s->stash(images => \@docs);
      $s->render;
      $return = 1;
  });;
  $delay->begin;
  my $img =  $coll->find()->all(sub {
    my ($cursor, $err, $docs) = @_;
    $delay->end(@$docs);
  });

  my @docs;
    @docs = $delay->wait unless Mojo::IOLoop->is_running;


#  $s->render_later;
  #  block
  while (not $return) {
   Mojo::IOLoop->one_tick;
 }
}

sub upload {
  my $s = shift;

  if ($s->stash('name')) {
    $s->app->log->debug($s->stash('name'));
    $s->render("upload/".$s->stash('name'));
  } else {
    if ($s->stash('format') eq 'json') {
      $s->app->log->debug("format is json");
#   
#      $s->app->log->debug($data);
      my $src = $s->req->param('src');

      #  strip MIME header to save only binary image
      #  as base64 is roughly 30% bigger
      #
      $src =~ s/^data:(.*?)base64,//;
      my $type = $1;
      $s->app->log->debug("got image type $type");
      my $md5 = '';#MD5->hexhash($src);
      my %image = (
#  ensure uniqueness of image db
        _id => '',#MD5->hexhash($src),
#        md5 => MD5->hexhash($src),
        src => decode_base64url($src),
        uploadDate => DateTime->now,
        type => $type,
      );

      #  store everything the model sends
      #
      foreach my $name ($s->req->param) {
        unless (exists $image{$name}) {
          $image{$name} = $s->req->param($name);
#          $s->app->log->debug("$name => $image{$name}");
        }
      }
      try {
        $s->mango->db->collection('images')->insert(
          \%image
        );
      } finally {
        if (@_) {
          if ($_[0] eq 'E11000') {
#            $s->render_json({error => 'duplicate image, this image already exists in our dB'});
          } else {
            $s->render_json({error => join("<br>",@_)});
          }
        } else {
        }
          $s->render_json({message => 'yep'});
      };

    } else {
      $s->render_text('invalid upload!');
    }
  }
}
1;
