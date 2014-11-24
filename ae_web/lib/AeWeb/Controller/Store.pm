package AeWeb::Controller::Store;
use AeWeb::Schema;
use AeWeb::DBcommon;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::JSON;
use Mojo::IOLoop;
use Mojo::Util qw/dumper/;
use URI::Escape;
use URI;
use DateTime;
use DBI;
use Try::Tiny;
use DateTime::Format::DateManip;
use Date::Manip;
use Data::Dumper;

use base 'AeWeb::DBcommon';

sub storeData
{
  my ($s, $ae) = @_;
  my $dbh = $s->dbh;

  my ($server, $time, $playerId, $daysOld) = ($ae->{'server'}, $ae->{'time'}, $ae->{'playerID'}, $ae->{daysOld});
  map { delete $ae->{$_}; } qw/server time playerID daysOld/;

  my $dtServer = DateTime::Format::DateManip->parse_datetime(ParseDate($time));

#  for now i dont want old data
#
  if (defined $daysOld) {
    my $dtData = $dtServer->clone->subtract(days => $daysOld);
      $s->app->log->debug("data is old, not storing");
    return;
  }
  if (exists $ae->{astro}) {
    my ($key, $value) = each %{ $ae->{astro} };
    if (exists $ae->{astro}->{$key}->{daysOld}) {
      $s->app->log->debug("data is old, not storing");
      return;
    }
  }

  if (exists $ae->{url} and exists $ae->{msg} and exists $ae->{stack}) {
    my $sth = $dbh->prepare(qq/
      insert into aegisErrors (server, time, playerID, url, msg, stack)
      values(?,?,?,?,?,?)
      on duplicate key update
        time      = values(time),
        count = (count +1)
       /);
    try {
      $sth->execute($server, $time, $playerId, $ae->{url}, $ae->{msg}, $ae->{stack});
    } catch {
      die "error insert: $_";
    };
    return;
  } elsif (exists $ae->{regionStars}) {
    my $sth = $dbh->prepare(qq/
      insert into regionStars (server, starLoc) values (?,?)
      /);

    foreach my $starLoc (@{ $ae->{regionStars} }) 
    {
      try {
        $sth->execute($server, $starLoc);
      } catch {
        die "regionStars insert: $_";
      };
    }
  }

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
          (server,time,playerId,location,terrain,type,base, unknownFleet, unknownIncoming)
        values
          (?,?,?,?,?,?,?,?,?)
        on duplicate key update 
          time = values(time),
          terrain = values(terrain),
          type = values(type),
          base = values(base),
          unknownFleet = values(unknownFleet),
          unknownIncoming = values(unknownIncoming)
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
          (server,time,playerId,id,name,location,owner,occupier,economy,ownerIncome,tradeRoutes,commandCenters,jumpGate)
        values
          (?,?,?,?,?,?,?,?,?,?,?,?,?)
        on duplicate key update
          time      = values(time),
          name      = ifnull(values(name),name),
          owner      = values(owner),
          occupier      = ifnull(values(occupier),occupier),
          economy      = ifnull(values(economy),economy),
          ownerIncome      = ifnull(values(ownerIncome),ownerIncome),
          tradeRoutes      = ifnull(values(tradeRoutes),tradeRoutes),
          commandCenters      = ifnull(values(commandCenters), commandCenters),
          jumpGate      = ifnull(values(jumpGate), jumpGate)
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

        $sth = $dbh->prepare(qq/update astro set base = ? where server = ? and location = ?/);
        try {
          $sth->execute($id, $server, $e->{location});
        } catch {
          warn "astro base update: $_";
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
# parseMapFleet
        if (not exists $e->{ships}) {
          my $sth = $dbh->prepare(qq/
              delete from fleet where server = ? and location = ?
              /);
          try {
            $sth->execute($server, $e->{location});
          } catch {
            die "removing fleet: $_";
          };
        }

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
          $arrival = $dtArrival->strftime("%Y-%m-%d %H:%M:%S");
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

sub storeDataC
{
  my ($s, $ae) = @_;
  my ($server, $time, $playerID, $daysOld) = 
    map { $ae->{$_}; } qw/server time playerID daysOld/;

  my $dbh = $s->dbh($server);
  my $schema = $s->schema;
  my $dtServer = DateTime::Format::DateManip->parse_datetime(ParseDate($time));

  my $guildTag = '';
  my $dbPlayer = $schema->resultset('Player')->find($playerID);
  if (defined $dbPlayer) {
    $guildTag = $dbPlayer->guildTag;
  }

  if (defined $daysOld) {
    my $dtData = $dtServer->clone->subtract(days => $daysOld);
    $time = $dtData->strftime("%Y-%m-%d %H:%M:%S");
  #  die ("data is $daysOld days old");
  }

  if (exists $ae->{player}) {
    foreach my $id (keys %{$ae->{player}}) {
      my $e = $ae->{player}->{$id};
      my $guild = $e->{guild};
      $schema->resultset('Player')->update_or_create({
        id => $id,
        name => $e->{name},
        level => $e->{level},
        upgraded => $e->{upgraded},
        guildTag => $guild->{tag} || '',
        defaultServer => $server,
        });
    }
  }

  #  parsing of a recently downloaded galaxy map
  #
  if (exists $ae->{regionStars}) {
    my $sth = $dbh->prepare(qq/
      insert into regionStars (starLoc) values (?)
      /);

    foreach my $starLoc (@{ $ae->{regionStars} }) 
    {
      try {
        $sth->execute($starLoc);
      } catch {
        if ($_ !~ /Duplicate entry/) {
          die "regionStars insert: $_";
        }
      };
    }
  }

  #  if there is an astro with no base,
  #    somebody disbanded
  #
  my %baseRemoval = ();
  if (exists $ae->{astro}) {
    foreach my $location (keys %{$ae->{astro}}) {
      my $e = $ae->{astro}->{$location};

      my %col = map { $_ => $e->{$_} } qw/terrain type/;
      $col{location} = $location,
      $col{time} = $time;
      $col{guildTag} = $guildTag;

      $baseRemoval{$location}++;
      
      my $dbAstro = $schema->resultset('Astro')->update_or_create(%col);
    }

    if (defined $dbPlayer) {
      $schema->resultset('PlayerUsage')->update_or_create(
          {id => $dbPlayer->id, name => 'astroScan', last => $time});
    }
  }

###############################################################################
  return if (defined $daysOld);
###############################################################################

  if (exists $ae->{base}) {
    foreach my $id (keys %{$ae->{base}}) {
      my $e = $ae->{base}->{$id};
      my %col = map { $_ => $e->{$_} } qw/location owner occupier/;
      $col{id} = $id;
      $col{time} = $time;
      $col{guildTag} = $guildTag;

      my $dbBase =  $schema->resultset('Base')->update_or_create(%col);

      delete $baseRemoval{$col{location}};

      #  possibly not in packet
      #
      %col = map { $_ => $e->{$_} } 
        grep {exists $e->{$_}} qw/name economy ownerIncome tradeRoutes/;

      if (keys %col) {
        $col{time} = $time;
        $col{guildTag} = $guildTag;
        $dbBase->update_or_create_related('base_details', %col);
      }

      if (exists $e->{structures}) {
        my $e = $e->{structures};
        foreach (keys %$e) {
          %col = (
            name => $_,
            number => $e->{$_},
            time => $time,
            guildTag => $guildTag,
            );
          $dbBase->update_or_create_related('base_structures', %col);
        }

        if (defined $dbPlayer) {
          $schema->resultset('PlayerUsage')->update_or_create(
              {id => $dbPlayer->id, name => 'baseScan', last => $time});
        }
      }
    }
  }

  foreach my $loc (keys %baseRemoval) {
    my @rs = $schema->resultset('Base')->search({
      guildTag => $guildTag,
      location => $loc
    })->all;
    if ($#rs >= 0) {
#  multiple entries from multiple reporters
      $s->app->log->debug('removing orphan base '.$loc. " ".$#rs);
      $rs[0]->delete;

    } else {
      $s->app->log->debug('no orphans at '.$loc);
    }
  }

  if (exists $ae->{fleet}) {

# parseMapFleet is going to parse every fleet in a location
#   so we can use that to keep the ghosts down
#
    my %location;
    foreach my $id (keys %{$ae->{fleet}}) {
      my $e = $ae->{fleet}->{$id};
      if (not exists $e->{ships}) {
        $location{$e->{location}}++;
      }
    }
    if (keys %location == 1) {
      my @loc = keys %location;
      $schema->resultset('Fleet')->search({location => $loc[0]})->delete;
    }

    foreach my $id (keys %{$ae->{fleet}}) {
      my $e = $ae->{fleet}->{$id};
      my ($dbFleet, %col);
# add the new fleets
#
      %col = map { $_ => $e->{$_} }
        grep { exists($e->{$_}) } qw/name owner size origin location/;

      if (exists $e->{arrival}) {
        my $dtArrival = $dtServer->clone->add(seconds => $e->{arrival});
        $col{arrival} = $dtArrival->strftime("%Y-%m-%d %H:%M:%S");
      }
      $col{id} = $id;
      $col{time} = $time;
      $col{guildTag} = $guildTag;
      $dbFleet = $schema->resultset('Fleet')->update_or_create(%col);
# with details
#     
      $e = $e->{ships};
      if (defined $e) {
        foreach (keys %$e) {
          %col = (
            id => $id,
            name => $_,
            number => $e->{$_},
            time => $time,
            guildTag => $guildTag,
            );
          $schema->resultset('FleetShips')->update_or_create(%col);
#          $dbFleet->update_or_create_related('ships', %col);
        }
        if (defined $dbPlayer) {
          $schema->resultset('PlayerUsage')->update_or_create(
              {id => $dbPlayer->id, name => 'fleetScan', last => $time});
        }
      }
    }
  }
}

sub dumpPostData {
  my $s = shift;

  my $json = Mojo::JSON->new;

  $s->app->log->debug($s->req->body);

  my $aeData = $json->decode( $s->req->body );
  my $err  = $json->error;

  if ($json->error) {
    $s->stash(json => { error => $json->error });
    $s->render(status => 400);
    #$s->render(template => 'main/response', format => 'json');
  } else {
    my ($server, $time, $playerID, $daysOld) = map { $aeData->{$_}; } qw/server time playerID daysOld/;
    my $schema = $s->schema;
    if (defined $schema) {
      my $dbPlayer = $schema->resultset('Player')->find($playerID);
      if (defined $dbPlayer) {
        $s->app->log->debug(sprintf("%s %s", $dbPlayer->name, $dbPlayer->guildTag));
    my $dbUsage = $dbPlayer->find_or_create_related('player-usage', 
            {name => $s->req->headers->header('x-real-ip')});
    $dbUsage->update({ last => $time });
      }
    }

    try {
      $s->storeData($aeData);
      $s->stash(json => { response => 'sahksess' });
      $s->render(status => 200);
    } catch {
      $s->app->log->debug("error: $_");
      $s->stash(json => {response => $_ });
      $s->render(status => 500);
    };
  }
}

sub dumpPost {
  my $s = shift;

  $s->app->log->debug($s->req->body);

  my $json = Mojo::JSON->new;
  my $aeData = $json->decode( $s->req->body );
  my $err  = $json->error;

  if ($json->error) {
    $s->stash(json => { error => $json->error });
    $s->render(status => 400);
  } else {
    my ($server, $time, $playerID, $daysOld) = map { $aeData->{$_}; } qw/server time playerID daysOld/;

    my $schema = $s->schema($server);
    if (defined $schema) {
      my $dbPlayer = $schema->resultset('Player')->find($playerID);
      if (defined $dbPlayer) {
        $s->app->log->debug(sprintf("%s %s", $dbPlayer->name, $dbPlayer->guildTag));
    my $dbUsage = $schema->resultset('PlayerUsage')->find_or_create( 
            {name => $s->req->headers->header('x-real-ip')}, id => $dbPlayer->id);
    $dbUsage->update({ last => $time });
      }

    }

    try {
      $s->storeDataC($aeData);
      $s->app->log->debug("storeData2 succeeded");
      $s->stash(json => { response => 'success' });
      $s->render(status => 200);
    } catch{
      $s->app->log->debug("norm error: $_");
      if ($_ =~ /^(.*?)at \//) {
        $s->stash(json => {response => $1 });
      }
      $s->render(status => 500);
    };

  }
}

sub log {
  my $s = shift;

  $s->app->log->debug($s->req->body);

  my $json = Mojo::JSON->new;
  my $data = $json->decode( $s->req->body );
  my $err  = $json->error;

  if ($json->error) {
    $s->stash(json => { error => $json->error });
    $s->render(status => 400);
  } else {
    my ($server, $time, $playerID, $daysOld) = map { $data->{$_}; } qw/server time playerID daysOld/;

    my %ctx = map { $_ => $data->{$_} } grep { /time|playerID|line/ }keys %$data;

    my $schema = $s->schema($server);

    try {
      $schema->resultset('Log')->create(\%ctx);

      $s->stash(json => { response => 'success' });
      $s->render(status => 200);
    } catch{
      $s->app->log->debug("norm error: $_");
      if ($_ =~ /^(.*?)at \//) {
        $s->stash(json => {response => $1 });
      }
      $s->render(status => 500);
    };

  }
}

1;
