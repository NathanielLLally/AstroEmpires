package AeWeb::Controller::Ajax::DBIx;
use AeWeb::Schema;
use MooseX::Params::Validate;
use Mojo::Base 'Mojolicious::Controller';
use Mojo::Util qw/dumper/;

use base 'AeWeb::Controller::Ajax';

sub Astros {
  my $s = shift;
  my $schema =  $s->schema;

  my $rs = $schema->resultset('Astro')->search(
    {
      -and => [
        location => { like => "B39%" },
        -or      => [
          type => 'Planet',
          type => 'Moon',
          type => 'Asteroid',
        ],
      ],
    },
  );
  return $rs;
}

sub Test {
  my $s = shift;
  my $schema =  $s->schema;
  my $rs = $schema->resultset('BaseDetail')
    ->latest;
}

=pod
select b.time,b.guildTag as reporter,b.id,b.location, o.guildTag as ownerTag, o.name as owner, o.level, occ.guildTag as occupierTag,
 occ.name as occupier, d.economy,  d.ownerIncome, d.tradeRoutes, cc.n as commandCenters, jg.n as jumpGate, ds.value, ds.defenses
 from  base b join baseDetail d on b.id = d.id and b.guildTag = d.guildTag 
 inner join ( select max(b.time) as mtime, b.id from baseDetail b group by b.id ) md on d.id = md.id and  md.mtime = d.time
 join player o on o.id = b.owner   left join player occ on b.occupier = occ.id  
 left join (select time, number as n, id, guildTag from baseStructures where name = 'Command Centers') cc on cc.id = b.id and cc.guildTag = b.guildTag 
 left join (select time, number as n, id, guildTag from baseStructures where name = 'Jump Gate') jg on jg.id = b.id and jg.guildTag = b.guildTag 
 left join (select bs.id, group_concat(concat(bs.name,' ', bs.number) SEPARATOR ', ') as defenses,    (pow(m.level,2) * bs.number) as value, time 
  from baseStructures bs join ae.baseDefenseMap  m on bs.name=m.name group by id, guildTag) ds on ds.id = b.id 
  inner join ( select max(b.time) as mtime, b.id from baseStructures b group by b.id ) mbs on ds.id = mbs.id and  mbs.mtime = ds.time 
  inner join ( select max(b.time) as mtime, b.id from base b group by b.id ) mb on b.id = mb.id and  mb.mtime = b.time
  where b.location like concat(Plocation,'%') limit pageStart, pageLength;

=cut

sub AllBases {
  my $s = shift;
  my $schema =  $s->schema;

#  $s->app->log->debug(dumper $schema->resultset('Base')->result_source->columns);
#  $schema->resultset('BaseDetail')
#    ->latest;

#  my $rsBS = $schema->resultset('BaseStructures')
#    ->pivot(['Command Centers', 'Jump Gate']);

  $schema->resultset('Base')
    ->strip
    ->latest
  
#    ->with_detail
#    ->with_owner
#    ->with_occupier
}

=pod
CREATE PROCEDURE pTargets (IN PguildTag VARCHAR(20))
  begin  
  select b.time,b.location, o.guildTag as ownerTag, o.name as owner, o.level, d.economy,  d.ownerIncome,
  d.tradeRoutes, cc.n as commandCenters, f.size as fleet, ds.defenses 
  from  base b join baseDetail d on b.id = d.id and b.guildTag = d.guildTag
  inner join ( select max(b.time) as mtime, b.id from baseDetail b group by b.id ) md on d.id = md.id and  md.mtime = d.time 
  join player o on o.id = b.owner
  left join (select time, number as n, id, guildTag from baseStructures where name = 'Command Centers') cc 
  on cc.id = b.id and cc.guildTag = b.guildTag
  left join (select bs.id, group_concat(concat(bs.name,' ', bs.number) SEPARATOR ', ') as defenses,
      (pow(m.level,2) * bs.number) as value, time 
      from baseStructures bs join ae.baseDefenseMap  m on bs.name=m.name group by id, guildTag) ds  on ds.id = b.id
  inner join ( select max(b.time) as mtime, b.id from baseStructures b group by b.id ) mbs on ds.id = mbs.id and  mbs.mtime = ds.time
  inner join ( select max(b.time) as mtime, b.id from base b group by b.id ) mb on b.id = mb.id and  mb.mtime = b.time
  join (select sum(size) as size, location, guildTag from fleet group by location, guildTag) f on b.location = f.location and b.guildTag = f.guildTag
  where b.occupier is null
  and d.ownerIncome = 100
  and o.guildTag != PguildTag;
  end//

=cut

sub Targets
{
  my $s = shift;
}

=pod
CREATE PROCEDURE pFleet (IN PguildTag VARCHAR(20))
  begin  
  select f.time, f.size, f.location, o.guildTag, o.name, f.arrival, fs.ships
  from fleet f join player o on o.id = f.owner 
  join (select id, guildTag, group_concat(concat(name,' ', number) SEPARATOR ', ') as ships
      from fleetShips group by id) fs  on f.id = fs.id group by f.location;
  end//

=cut

sub Fleet
{
  my $s = shift;
  my $schema =  $s->schema;
  my $rs = $schema->resultset('Fleet')->search(
    {},
    {
      join => [qw/owner fleetShips/],
      columns => [qw/ time size location owner.guildTag owner.nate arrival/],
      collapse => 1,
    },
  );
  return $rs;
}

sub MyBase1
{
  my $s = shift;
  my $schema = $s->schema;

  $schema->resultset('Base')->search({
    owner => $s->session('playerID')
  })
    ->strip
    ->latest
    ->with_detail
    ->with_owner
    ->with_occupier
    ->pivot_structures(['Command Centers', 'Jump Gate']);
}

sub MyBase
{
  my $s = shift;
  my $schema =  $s->schema;
=pod
  my $rsMaxTime = $schema->resultset('Base')->search(
      {},
      {
        columns  => [
          { 
            mtime => { max => 'me.time' },
            id => 'id',
            bdMtime => { max => 'baseDetail.time' },
            bdId => 'baseDetail.id',
            bsMtime => { max => 'baseStructures.time' },
            bsId => 'baseStructures.id',
          }
          ],
        join => [qw/baseDetail baseStructures/],
        group_by  => [qw/me.id baseDetail.id baseStructures.id/],
        alias => 'mtime',
        %{ $ctx{searchOptions} }
      }
      );
=cut
  my $baseMaxTime = $schema->resultset('Base')->search(
      {},
      {
        columns  => [
          { 
            mtime => { max => 'time' },
            id => 'id',
          }
          ],
        group_by  => ['id'],
      }
      );

  my $base = $schema->resultset('Base');
  my $baseDetail = $schema->resultset('BaseDetail');
  my $rs = $schema->resultset('Base')->search(
      {
        owner => $s->session('playerID'),
        $base->current_source_alias . '.time' => { '=' => $base->search(
          {
            location => { -ident => $base->current_source_alias . '.location' },
          },
          {
            columns  => [ { 
              mtime => { max => 'time' },
              location => 'location',
              } ],
            group_by  => ['location'],
            alias => 'latestBase'
          })->get_column('mtime')->as_query },
        'baseDetail.time' => { '=' => $baseDetail->search(
          {
            id => { -ident => $base->current_source_alias . '.id' },
          },
          {
            columns  => [ { 
              mtime => { max => 'time' },
              id => 'id',
              } ],
            group_by  => ['id'],
            alias => 'latestDetail'
          })->get_column('mtime')->as_query },
      },
      {
      join => [qw/owner occupier baseDetail/],
      collapse => 1,
      'columns' => [
        (
         grep { $_ !~ /^(owner|occupier|id|guildTag)$/ }
         $schema->source('Base')->columns
        ),
        (map
         { +{ "$_" => "baseDetail.$_" } }
         grep { $_ !~ /^(id|guildTag|time)$/ }
         $schema->source('BaseDetail')->columns
        ),
        (
         { "owner" => "owner.name" },
         { "ownerTag" => "owner.guildTag" },
         { "ownerLevel" => "owner.level" },
         { "occupier" => "occupier.name" },
         { "occupierTag" => "occupier.guildTag" },
        ),
        ],
      });
=pod
=pod
  my $base = $schema->resultset('Base');
  my $baseDetail = $schema->resultset('BaseDetail');
  my $rs = $schema->resultset('Base')->search(
      {
        owner => $s->session('playerID'),
        $base->current_source_alias . '.time' => { '=' => $base->search(
          {
            id => { -ident => $base->current_source_alias . '.id' },
            guildTag => { -ident => $base->current_source_alias . '.guildTag'},
          },
          {
            columns  => [ { 
              mtime => { max => 'time' },
              id => 'id',
              } ],
            group_by  => ['id'],
            alias => 'latestBase'
          })->get_column('mtime')->as_query },
        'baseDetail.time' => { '=' => $baseDetail->search(
          {
            id => { -ident => $baseDetail->current_source_alias . '.id' },
            guildTag => { -ident => $baseDetail->current_source_alias . '.guildTag'},
          },
          {
            columns  => [ { 
              mtime => { max => 'time' },
              id => 'id',
              } ],
            group_by  => ['id'],
            alias => 'latestDetail'
          })->get_column('mtime')->as_query },
      },
      {
      join => [qw/baseDetail owner occupier/],
      collapse => 1,
      'columns' => [
        (
         grep { $_ !~ /^(owner|occupier|id)$/ }
         $schema->source('Base')->columns
        ),
        (map
         { +{ "$_" => "baseDetail.$_" } }
         grep { $_ !~ /^(id|guildTag|time)$/ }
         $schema->source('Base')->related_source('baseDetail')->columns
        ),
        (
         { "owner" => "owner.name" },
         { "ownerTag" => "owner.guildTag" },
         { "ownerLevel" => "owner.level" },
         { "occupier" => "occupier.name" },
         { "occupierTag" => "occupier.guildTag" },
        ),
        ],
        %{ $ctx{searchOptions} }
      });
=pod
=pod
  $s->app->log->debug('pid: '.$s->session('playerID'));

  my $rs = $schema->resultset('Base')->search(
      {
        owner => $s->session('playerID'),
      },
      {
      prefetch => [qw/baseDetail owner occupier/],
      collapse => 1,
  });
=cut
  return $rs;
}

1;
