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
use DBI;
use Try::Tiny;
use DateTime::Format::DateManip;
use Date::Manip;
use Data::Dumper;

sub index {
  my $s = shift;
  $s->render;
}


sub storeData
{
  my ($s, $ae) = @_;

  my $dbh = DBI->connect_cached("DBI:mysql:database=ae;",'ae', 'q1w2e3r4', {'RaiseError' => 1, AutoCommit => 1});
  if (not defined $dbh) {
    $s->app->log->debug(DBI::errstr);
    return;
  }

  my ($server, $time, $playerId) = ($ae->{'server'}, $ae->{'time'}, $ae->{'playerID'});

  my $dtServer = DateTime::Format::DateManip->parse_datetime(ParseDate($time));


  map { $s->app->log->debug($_); delete $ae->{$_}; } qw/server time playerID/;
  $s->app->log->debug(Dumper(\$ae));

  foreach my $dbTable (keys %$ae) {
    if ($dbTable eq 'player') {

      foreach my $id (keys %{$ae->{player}}) {
        my $p = $ae->{player}->{$id};
        my $guild = $p->{guild};

        my $sth = $dbh->prepare(qq/
        insert into player
          (server, time, playerId, id, name, level, upgraded, guildTag, guildId, guildName)
        values
          (?,?,?,?,?,?,?,?,?,?)
        on duplicate key update
          time      = values(time),
          name      = values(name),
          level     = ifnull(values(level), level),
          upgraded  = ifnull(values(upgraded), upgraded),
          guildTag  = values(guildTag),
          guildId   = ifnull(values(guildId),guildId),
          guildName = ifnull(values(guildName), guildName)
          /);

        my $i = 1;
        $sth->bind_param($i++, $server);
        $sth->bind_param($i++, $time);
        $sth->bind_param($i++, $playerId);
        $sth->bind_param($i++, $id);
        $sth->bind_param($i++, $p->{name});
        $sth->bind_param($i++, $p->{level});
        $sth->bind_param($i++, $p->{upgraded});
        $sth->bind_param($i++, $guild->{tag});
        $sth->bind_param($i++, $guild->{id});
        $sth->bind_param($i++, $guild->{name});
        try {
          $sth->execute();
        } catch {
          die "player upsert: $_";
        };

      }
    } elsif ($dbTable eq 'astro') {
      foreach my $loc (keys %{$ae->{astro}}) {
        my $e = $ae->{astro}->{$loc};

        my $sth = $dbh->prepare(qq/
        insert into astro
          (server,time,playerId,location,terrain,type,base, unknownFleet, unknownIncoming, daysOld)
        values
          (?,?,?,?,?,?,?,?,?,?)
        on duplicate key update 
          time = values(time),
          terrain = values(terrain),
          type = values(type),
          base = values(base),
          unknownFleet = values(unknownFleet),
          unknownIncoming = values(unknownIncoming),
          daysOld = values(daysOld)
        /);
        my $i = 1;
        $sth->bind_param($i++, $server);
        $sth->bind_param($i++, $time);
        $sth->bind_param($i++, $playerId);
        $sth->bind_param($i++, $loc);
        $sth->bind_param($i++, $e->{terrain});
        $sth->bind_param($i++, $e->{type});
        $sth->bind_param($i++, $e->{base});
        $sth->bind_param($i++, $e->{unknownFleet});
        $sth->bind_param($i++, $e->{unknownIncoming});
        $sth->bind_param($i++, $e->{daysOld});

        try {
          $sth->execute();
        } catch {
          die "astro upsert: $_";
        };
      }

    } elsif ($dbTable eq 'base') {
      foreach my $id (keys %{$ae->{base}}) {
        my $e = $ae->{base}->{$id};

        my $sth = $dbh->prepare(qq/
        insert into base
          (server,time,playerId,id,name,location,owner,occupier,economy,ownerIncome,tradeRoutes,barracks,laserTurrets,missileTurrets,ionTurrets,photonTurrets,disruptorTurrets,deflectionShields,planetaryShields,planetaryRing,commandCenters,jumpGate)
        values
          (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        on duplicate key update
          time      = values(time),
          name      = values(name),
          owner      = values(owner),
          occupier      = values(occupier),
          economy      = values(economy),
          ownerIncome      = ifnull(values(ownerIncome),ownerIncome),
          tradeRoutes      = ifnull(values(tradeRoutes),tradeRoutes),
          commandCenters      = values(commandCenters),
          jumpGate      = values(jumpGate)
          /);
        my $i = 1;
        $sth->bind_param($i++, $server);
        $sth->bind_param($i++, $time);
        $sth->bind_param($i++, $playerId);
        $sth->bind_param($i++, $id);
        $sth->bind_param($i++, $e->{name});
        $sth->bind_param($i++, $e->{location});
        $sth->bind_param($i++, $e->{owner});
        $sth->bind_param($i++, $e->{occupier});
        $sth->bind_param($i++, $e->{economy});
        $sth->bind_param($i++, $e->{ownerIncome});
        $sth->bind_param($i++, $e->{tradeRoutes});
        $sth->bind_param($i++, $e->{commandCenters});
        $sth->bind_param($i++, $e->{jumpGate});
        try {
          $sth->execute();
        } catch {
          die "base upsert: $_";
        };

        if (exists $e->{defenses}) {
          $e = $e->{defenses};
          $sth = $dbh->prepare(qq/
          insert into base
            (server,playerId,id,barracks,laserTurrets,missileTurrets,ionTurrets,photonTurrets,disruptorTurrets,deflectionShields,planetaryShields,planetaryRing)
          values
            (?,?,?,?,?,?,?,?,?,?,?,?)
          on duplicate key update
            barracks      = values(barracks),
            laserTurrets      = values(laserTurrets),
            missileTurrets      = values(missileTurrets),
            ionTurrets      = values(ionTurrets),
            photonTurrets      = values(photonTurrets),
            disruptorTurrets      = values(disruptorTurrets),
            deflectionShields      = values(deflectionShields),
            planetaryShields      = values(planetaryShields),
            planetaryRing      = values(planetaryRing)
          /);

          $i = 1;
          $sth->bind_param($i++, $server);
          $sth->bind_param($i++, $playerId);
          $sth->bind_param($i++, $id);
          $sth->bind_param($i++, $e->{Barracks});
          $sth->bind_param($i++, $e->{'Laser Turrets'});
          $sth->bind_param($i++, $e->{'Missile Turrets'});
          $sth->bind_param($i++, $e->{'Ion Turrets'});
          $sth->bind_param($i++, $e->{'Photon Turrets'});
          $sth->bind_param($i++, $e->{'Disruptor Turrets'});
          $sth->bind_param($i++, $e->{'Deflection Shields'});
          $sth->bind_param($i++, $e->{'Planetary Shields'});
          $sth->bind_param($i++, $e->{'Planetary Ring'});

          try {
            $sth->execute();
          } catch {
            die "base upsert: $_";
          };
        }
      }
    } elsif ($dbTable eq 'fleet') {
      foreach my $id (keys %{$ae->{$dbTable}}) {
        my $e = $ae->{$dbTable}->{$id};

        my $sth = $dbh->prepare(qq/
        insert into fleet
          (server,time,playerId,id,name,player,size,origin,location,arrival,ships)
        values
          (?,?,?,?,?,?,?,?,?,?,?)
        on duplicate key update 
          time = values(time),
          name = ifnull(values(name),name),
          player = values(player),
          size = values(size),
          origin = ifnull(values(origin), origin),
          location = values(location),
          arrival = values(arrival),
          ships = ifnull(values(ships), ships)
        /);

        my $i = 1;
        $sth->bind_param($i++, $server);
        $sth->bind_param($i++, $time);
        $sth->bind_param($i++, $playerId);
        $sth->bind_param($i++, $id);
        $sth->bind_param($i++, $e->{name});
        $sth->bind_param($i++, $e->{player});
        $sth->bind_param($i++, $e->{size});
        $sth->bind_param($i++, $e->{origin});
        $sth->bind_param($i++, $e->{location});

        my $arrival = undef;
        if (exists $e->{arrival}) {
          my $dtArrival = $dtServer->clone->add(seconds => $e->{arrival});
          $arrival = $dtArrival->strftime("%Y-%m-%d %I:%M:%S %p");
        }
        $sth->bind_param($i++, $arrival);

        my $ships = undef;
        if (exists $e->{ships}) {
          my $es = $e->{ships};
          $ships = join('|', map { "$_:".$es->{$_}; } keys %$es);
        }
        $sth->bind_param($i++, $ships);

        try {
          $sth->execute();
        } catch {
          die "fleet upsert: $_";
        };
      }
    }
  }

}

sub dumpPostData {
  my $s = shift;

  $s->app->log->debug($s->req->body);

  my $json = Mojo::JSON->new;

  my $aeData = $json->decode( $s->req->body );
  my $err  = $json->error;

  if ($json->error) {
    $s->stash(json => { error => $json->error });
    $s->render(status => 400);
    #$s->render(template => 'main/response', format => 'json');
  } else {

    try {
      $s->storeData($aeData);

      $s->app->log->debug("storeData succeeded");
      $s->stash(json => { response => 'sahksess' });
      $s->render(status => 200);
    } catch {
        $s->app->log->debug("error: $_");
        $s->stash(json => {response => $_ });
        $s->render(status => 500);
    };
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
