// ==UserScript==
// @name        aegis
// @description Astro Empires Galaxy Information Service
// @namespace   http://cirrus.airitechsecurity.com
// @downloadURL http://cirrus.airitechsecurity.com/dev/js/aegis.user.js
// @resource    aegis.css    http://cirrus.airitechsecurity.com/dev/css/aegis.css
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require     http://ajax.googleapis.com/ajax/libs/jqueryui/1.9.2/jquery-ui.min.js
// @require     http://cirrus.airitechsecurity.com/js/moment.min.js
// @require     http://cirrus.airitechsecurity.com/js/moment-duration-format.min.js
// @include     *.astroempires.com/*
// @exclude     *.astroempires.com/
// @exclude     *.astroempires.com/login.aspx*
// @exclude     *.astroempires.com/home.aspx
// @version     1.3
// @grant       GM_xmlhttpRequest
// @grant       GM_log
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_deleteValue
// @grant       GM_listValues
// @grant       GM_info
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_openInTab
// ==/UserScript==

/* TODO:
 *
 *
 *
 *  follow settings for empire -> base or empire -> system -> fleet
 *    then put some minimum time on empire
 *
 * event system ideas
 *   register 
 *
 */
//boards ad
if (window.name == 'aswift_1') {
  return;
}

/* global variables filled by dispatch */
var aegis = this;
var server,serverURL,playerID,serverTime;
var mServerTime, mLocalStartTime;

var aegisURL = "http://cirrus.airitechsecurity.com/ae/";
var aegisURLstore = "gis/2.json";
var aegisURLquery = "gis/q.json";
var aegisURLlog = "gis/log.json";

var ships = ['Fighters','Bombers','Heavy Bombers','Ion Bombers','Corvette','Recycler','Destroyer','Frigate','Ion Frigate','Scout Ship','Outpost Ship','Cruiser','Carrier','Heavy Cruiser','Battleship','Fleet Carrier','Dreadnought','Titan','Leviathan','Death Star'];

var shipAbbrev = ['ft','b','hb','ib','cv','rc','ds','fri','ifri','s','os','cru','car','hcru','bs','fcar','dred','tit','levi','death'];

var version = GM_info.script.version;
console.log("running aegis v"+version+" grease monkey v"+GM_info.version);

moment.prototype.formatDefault = function()
{
  return this.format("YYYY-MM-DD HH:mm:ss");
}


this.log = function()
{
  var args = Array.prototype.slice.call(arguments);
  var line = [];
  //build a string

  args.forEach(function (el, i ,a) {
    if (typeof el === "string") {
      line.push(el);
    } else if (typeof el === "array") {
      line.push("[" + el.join(',') + "]");
    } else if (typeof el === "object") {
      line.push(JSON.stringify(el, null, '\t'));
    }
  });
  ctxSendToServer({route: aegisURLlog,
    data: {line: line.join('\n')}});
}

//  debugging function
//
this.trace = {};
function logTrace(msg) {
  var s = new Error().shortstack();
  s.shift(); //this
  if (s[0].match(/^tryAssertHas/)) {
    s.shift(); //tryAssertHas can be skipped also
  }
  var caller = {
    trace: s.shift()
  };
  caller.fqn = caller.trace.match(/(.*):\d+/)[1];
  caller.fn = caller.fqn.match(/(.*)@/)[1];
  caller.line = caller.trace.match(/.*@.*:(\d*)/)[1];

  try {
    assertHas(aegis.trace[caller.fqn], {marker: "number"});
    aegis.trace[caller.fqn].marker++;
  } catch(e) {
    aegis.trace[caller.fqn] = {marker: 1};
  }

  var m = aegis.trace[caller.fqn].marker;
  if (typeof msg !== "undefined") {
    m = msg;
  }
  console.log("[",caller.fn, ":",caller.line,"] > ", m );
}

/* attempt at creating a tab */
(this.setTabName = function() {
  if (window.document.location.href.match (/(.+?)astroempires.com/)) {
    if (!window.name.match(/^aegis/)) {
      var id = GM_getValue("aegisTabID", 0) + 1;
      window.name = "aegis"+id;
      GM_setValue("aegisTabID", id);
    }
  }
  console.log("tab name: "+window.name);
  console.log('next tabID:'+GM_getValue("aegisTabID", 0));
})();

function getTabID()
{
  var id = window.name;
  if (id.match(/^aegis(\d+)/)) {
    return id.match(/^aegis(\d+)/)[1];
  }
}

function checkForUpdate() 
{
  var plugin_url="http://cirrus.airitechsecurity.com/dev/js/aegis.user.js";
  if ((parseInt(GM_getValue('last_update', '0')) + 3600000 <= (new Date().getTime()))){
    GM_xmlhttpRequest( {
      method: 'GET',
      url: plugin_url,
      headers: {'Cache-Control': 'no-cache'},
      ignoreCache: true,
      onload: function(resp){
        var local_version, remote_version, rt, script_name;

        rt=resp.responseText;
        remote_version = parseFloat(/@version\s*(.*?)\s*$/m.exec(rt)[1]);
        local_version = parseFloat(version);

        script_name = (/@name\s*(.*?)\s*$/m.exec(rt))[1];

        if (remote_version > local_version){

          if(confirm('There is an update available for the Greasemonkey script ['+script_name+']\nWould you like to install it now?')){
            GM_openInTab(plugin_url);
          }
        }
        else{
    console.log('last updated ', moment(new Date().setTime(GM_getValue('last_update', '0'))).format("YYYY-MM-DD hh:mm:ss"));
          console.log('No update is available for "'+script_name+'"');
          consoleMsg('no new update for "'+script_name+'"');
        }
        GM_setValue('last_update', new Date().getTime()+'');
      }
    });
  } else {
    console.log('last updated ', moment(new Date().setTime(GM_getValue('last_update', '0'))).format("YYYY-MM-DD hh:mm:ss"));
    //    consoleMsg('last update check ' + ( parseInt(((new Date().getTime()) - GM_getValue('last_update', '0')) / 1000)) + 's ago');
  }

}

/* this function should be called once at script load time
 * to see if a previous session had connection issues and send all the data 
 */
function checkSendBufferCache()
{
  var keys = GM_listValues();

  var key = keys[0];
  for (var i=0; key != null; key=keys[i++] ) {

    if(key.match(/^sendBuffer:(.*?):/)) {
      var route = key.match(/^sendBuffer:(.*?):(.*?):/)[1];
      var cbString = key.match(/^sendBuffer:(.*?):(.*?):/)[2];
      console.log('sendbuffer post route:' + route);
      var postData = GM_getValue(key);
      var data = JSON.parse(postData);
      GM_deleteValue(key);
      ctxSendToServer({data:data, route:route, ondispatch:cbString});
    }
    /*
    if (key.match(/^setting:/)) {
      GM_deleteValue(key);
    }
    if (key.match(/^starMap:/)) {
      GM_deleteValue(key);
    }
    if (key.match(/^sendQ:/)) {
      GM_deleteValue(key);
    }
    */
  }
}

function checkSend(hashKey)
{
  var postData = GM_getValue(hashKey);
//  GM_deleteValue(hashKey);
//  return;
  if (postData != null) {
    consoleMsg("<span class='panicMsg'>server connection timeout<br>please restart firefox</span>");
    var data = JSON.parse(postData);
    console.log(postData);
    var route = hashkey.match(/^sendBuffer:(.*?):/)[1];
    var cbString = hashkey.match(/^sendBuffer:(.*?):(.*?)/)[2];
    ctxSendToServer({data:data, route:route, ondispatch:cbString});
  }
}

/*  cbString must be a string that is a name of a function
 *  within aegis object (set within buffer using GM_setValue)
 *
 */
this.ctxSendToServer = function(ctx) {
  try {
    assertHas(ctx, {data: "object"});
  } catch(e) {
    logTrace();
    consoleMsg(e.message, "errMsg");
    return;
  }

  try {
    assertHas(ctx, {route: "string"});
  } catch(e) {
    ctx.route = aegisURLstore;
  }
   
  if (typeof ctx.data.time == "undefined") {
    ctx.data.time = serverTime;
  }
  if (typeof ctx.data.server == "undefined") {
    ctx.data.server = server;
  }
  if (typeof ctx.data.playerID == "undefined") {
    ctx.data.playerID = playerID;
  }

  var hashKey = "sendBuffer:"+ctx.route+":"+ctx.onload+":"+ctx.data['time'];
  var postData = JSON.stringify(ctx.data);
  console.log("posting to aegis server: "+ctx.route + " " + postData);
  //  consoleMsg("sending to server");

  GM_setValue(hashKey, postData);

  GM_xmlhttpRequest({
    method: "POST",
    url: aegisURL + ctx.route,
    data: postData,
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    timeout: 15000,
    ontimeout: function(response) {
      console.log("ontimeout :"+response);
      checkSend(hashKey);
    },
    onerror: function(response) {
      console.log("onerror :"+response);
    },
    onload: function(response) {
      console.log("onload :" + JSON.stringify(response));
      console.log("clearing "  +hashKey);
      GM_deleteValue(hashKey);
      var jsonResponse = JSON.parse(response.responseText);
      if (response.status == 200) {
        if (ctx.ondispatch != null) {
          var ondispatch = ctx.ondispatch;
          delete ctx.ondispatch;
          try {
            aegis[ondispatch](jsonResponse);
          } catch(e) {
            console.log(e);
          };
        } else {

          console.log("got json status from server: "+jsonResponse.response);
          if (typeof jsonResponse.response != "undefined") {
      //      consoleMsg("server response: "+jsonResponse.response);
          }
        }
       
      } else {
        console.log('server error');
        consoleMsg("server error<br>&nbsp;&nbsp;" + jsonResponse.response, "errMsg");
        //console.log(response.status);
      }

    }
  });
}

this.getGalaxyXML = function(context)
{
  var galaxy = context.galaxy;
  var callback = context.callback;

  console.log('getGalaxyXML');
  consoleMsg("obtaining "+server+" galaxy "+galaxy+" xml" );
  var galaxyNum = galaxy.match(/\d+/)[0];
  var rs = {
    server: server,
    regionStars: []
  };
  console.log(serverURL + "/galaxies_xml/" + server + "-"+galaxyNum+".xml");

  GM_xmlhttpRequest({
    method: "GET",
    url: serverURL + "/galaxies_xml/" + server + "-"+galaxyNum+".xml",
    onload: function(response) {
      console.log("onload : xml");
      if (response.status == 200) {
        consoleMsg("parsing galaxy ["+galaxy+"] xml");
        var xmlDoc = $.parseXML( response.responseText ),
        $xml = $( xmlDoc );

        //var systems = [];
        $xml.find('region').each ( function() {
          var region = this.id;
          $(this).find('stars').each(function() {
            var matches, regex = /(\d+).*?;/g, systems = [];
            while (matches = regex.exec($(this).text())) {
              systems.push(matches[1]);
              rs.regionStars.push(galaxy+":"+region+":"+matches[1]);
            }
//            console.log('setvalue '+'starMap:'+galaxy+":"+region + " = " + systems.join(":"));
            GM_setValue('starMap:'+galaxy+":"+region, systems.join(":"));
            //      console.log(galaxy+":"+region+":"+$(this).text());
          });
          //console.log($stars.text);
        });
        ctxSendToServer({data:rs});

        if (callback != null) {
          if (typeof callback == "string") {
            aegis[callback]();
          } else {
            callback(); 
          }
        }
      } else {
        console.log("hmm");
        //console.log(response.status);
      }
    }
  });
}

function freeAccountRemoveAd(doc)
{
  var elem = doc.getElementById('advertising');
  if (elem != null) {
    elem.id="seeya";
    elem.innerHTML="";
  }
}

/* ripped from ae common
*/
//return true if a variable exists (is defined)
function exists (obj){
  if (typeof (obj) != "undefined" && obj != null)
    return true;

  return false;
}
//return an element by id, or object reference
function getElement(obj){
  if (typeof(obj) == "string"){

    if (document.getElementById == undefined || !document.getElementById)
      return false;

    obj = document.getElementById(obj);	
  }

  if (obj == undefined || !obj)
    return false;

  return obj;
}

/*  toggle an objects visible style settings
 *    (display, visibility, and zIndex)
 *
 *  also, store them so that all tabs retain the same settings
 */
function toggle (obj, displayType, state){
  if (displayType == null || displayType == undefined)
    displayType = "block";

  obj = getElement(obj);

  if (!obj)
    return false;

  if (state != null && state != undefined){
    if (state) {
      obj.style.display = displayType;
      obj.style.zIndex = "999999";
      obj.style.visibility = "visible";
    } else {
      obj.style.display = "none";
      obj.style.visibility = "hidden";
      obj.style.zIndex = "-999999";
    }

  }else{
    if (!obj.style.display || obj.style.display == displayType) {

      obj.style.display = "none";
      obj.style.visibility = "hidden";
      obj.style.zIndex = "-999999";
    } else {
      obj.style.display = displayType;
      obj.style.visibility = "visible";
      obj.style.zIndex = "999999";
    }
  }
  GM_setValue("setting:style:display:" +obj.id, obj.style.display);
  GM_setValue("setting:style:visibility:" +obj.id, obj.style.visibility);
  GM_setValue("setting:style:zIndex:" +obj.id, obj.style.zIndex);
}

function show(obj, displayType){
  toggle(obj, displayType, true);
}

function hide(obj, displayType){
  toggle(obj, displayType, false);
}

function getScrollX(){
  if (exists(window.pageXOffset))
    return window.pageXOffset;
  else if (exists(document.documentElement) && exists(document.documentElement.scrollLeft))
    return document.documentElement.scrollLeft;
  else if (exists(document.body.scrollLeft))
    return document.body.scrollLeft;
  else 
    return 0;
}

function getScrollY(){
  if (exists(window.pageYOffset))
    return window.pageYOffset;
  else if (exists(document.documentElement) && exists(document.documentElement.scrollTop))
    return document.documentElement.scrollTop;
  else if (exists(document.body.scrollTop))
    return document.body.scrollTop;
  else 
    return 0;
}

function registerEvent(obj, event, callback, capture){
  if (!exists(obj) || !exists(event) || !exists(callback))
    return false;

  if (typeof(capture) == "undefined")
    capture = true;

  if (exists(obj.attachEvent))
    return obj.attachEvent("on"+event, callback);
  else if (exists(obj.addEventListener))
    return obj.addEventListener(event, callback, capture);
  else
    return false;
}

function unregisterEvent(obj, event, callback, capture){
  if (!exists(obj) || !exists(event) || !exists(callback))
    return false;

  if (typeof(capture) == "undefined")
    capture = true;

  if (exists(obj.detachEvent))
    return obj.detachEvent("on"+event, callback);
  else if (exists(obj.removeEventListener))
    return obj.removeEventListener(event, callback, capture);
  else
    return false;
}

/*  curGalReg is the element where scanRegion takes it's region from
 *    while moving around in the map, this element will take the currently
 *    selected galaxy/region
 *
 *  TODO: get off the half-second timer for an update
 */
function updateGalaxyRegion () {
  var curGalReg = document.getElementById('curGalReg');
  if (curGalReg == null) {
    console.log('curGalReg is null!');
    return;
  }
  var region = unsafeWindow.mapCurrentRegion;
  var galaxy = unsafeWindow.starsGalaxy;
  if (region == null) {
    if (document.URL.match(/([A-Za-z][0-9]{2}):([0-9]{2})/)) {
      var gr = document.URL.match(/([A-Za-z][0-9]{2}):([0-9]{2})/);
      galaxy = gr[1];
      region = gr[2];
    } else {
      return;
    }
  }
  curGalReg.innerHTML = galaxy;
  if (region != null) {
    curGalReg.innerHTML += ":" + region;
  }

  var getLoc = document.getElementById('getLocation');

  var changeRegion = function(){ updateGalaxyRegion(); };
  if (getLoc != null && getLoc.value.match(/[A-Za-z][0-9]{2}:[0-9]{2}$/)) {
    curGalReg.innerHTML = getLoc.value.match(/[A-Za-z][0-9]{2}:[0-9]{2}$/)[0];
    registerEvent(getLoc, "change", changeRegion);
  }

  var t = window.setTimeout(updateGalaxyRegion, 500);
}

function myFleet(id)
{
  return JSON.parse(GM_getValue("myfleet:"+id, {}));
}

function myFleetAt(location)
{
  var fleet = JSON.parse(GM_getValue("myfleet:at:"+location, null));
  return fleet;
}
function myFleetsTo(location)
{
  var fleets = JSON.parse(GM_getValue("myfleets:to:"+location, "[]"));
  logTrace(location + " " + JSON.stringify(fleets));
  return fleets;
}


this.ctxChainCmd = function(ctx, cmd)
{
//  logTrace();
  if (!tryAssertHas(cmd, {func: "string", ctx: "object"})) { return; };

  var tag = 'ctxChain:',
    chainID;
  try {
    assertHas(ctx, {chainID: "number"});
    chainID = ctx.chainID;
  } catch(e) {
    chainID = GM_getValue(tag + "next", 0);
    GM_setValue(tag + 'next', chainID + 1);
    logTrace('new chain id:'+chainID);
  }

  var chain = JSON.parse(GM_getValue(tag + chainID, "[]"));
  cmd.chainID = ctx.chainID;
  chain.push(cmd);
//  console.log(tag + chainID, JSON.stringify(chain));

  GM_setValue(tag + chainID, JSON.stringify(chain));

  ctx.chainID = chainID;
  return ctx;
}

this.ctxChainNext = function(ctx)
{
  logTrace();
  tryAssertHas(ctx, {chainID: "number"});
  var tag = 'ctxChain:';
  var chain = JSON.parse(GM_getValue(tag + ctx.chainID, "[]"));

  consoleMsg('doing next in chain '+tag + ctx.chainID);
  chain.forEach(function(el, i, a) { 
    consoleMsg("&nbsp;&nbsp;"+i+": "+el.func);
  });
  var cmd = chain.shift();
  if (typeof cmd == "undefined") {
    console.log("chain "+ctx.chainID +" over");
    delete ctx.chainID;
    return;
  }
  GM_setValue(tag + ctx.chainID, JSON.stringify(chain));

  cmd.chainID = ctx.chainID;
  console.log(cmd);
  try {
    ctxRunCmd(cmd);
  } catch(e) {
    console.log(e);
  }
}

//  the button
//
function moveScout(ctx)
{
  if (!tryAssertHas(ctx,{origin: "string", destination:"string"})) {return;}
  logTrace();
  ctx = ctxChainCmd(ctx,{func: 'scanRegion', ctx: {region: ctx.destination}});
  /*
  ctx = ctxChainCmd(ctx,{func: 'ctxMoveScout', ctx: {origin: ctx.destination, destination: ctx.origin}});
  ctx = ctxChainCmd(ctx,{func: 'scanRegion', ctx: {region: ctx.origin}});
  ctx = ctxChainCmd(ctx,{func: 'ctxMoveScout', ctx: {origin: ctx.origin, destination: ctx.destination}});
  logTrace();
  */
  ctxMoveScout(ctx);
}

this.ctxMoveScout = function(ctx)
{
  if (!tryAssertHas(ctx,{origin: "string", destination:"string"})) {return;}
  logTrace();
 
  var fleet = myFleetAt(ctx.origin);
  if (fleet != null) {
    logTrace();

    var data = {};
    data.destination = ctx.destination;
    data['Scout Ship'] = 1;

//    var ctx = {fleetID:fleet.id, data:data, origin:origin, onarrive:"ctxChainNext" };
    ctx.fleetID = fleet.id;
    ctx.data = data;
    ctx.onarrive = 'ctxChainNext';
    
//    var cmdCtx = { func: 'ctxReturnHome', ctx: ctx };
//    ctx = ctxChainCmd(ctx, cmdCtx);

    sendMoveFleet(ctx);
  } else {
    consoleMsg('no fleet @ '+origin, "errMsg");
  }
}

this.ctxReturnHome = function(ctx)
{
  logTrace();

  ctx.url = serverURL+"/fleet.aspx";
  ctx.msg =  "verifying arrival";
  ctx.onload = "ctxLoadDispatch";
  ctx.ondispatch = "sendMoveFleet";

  var origin = ctx.origin;
  ctx.origin = ctx.data.destination;
  ctx.data.destination = origin;

  console.log(ctx);
  ctxQueueGet(ctx);

  if (!isSending()) {
    sendQueued({doneMsg: "fleet sent home"});
  }

}

this.ctxCheckFleet = function(ctx) {
  logTrace(JSON.stringify(ctx));
  assertHas(ctx,{destination: "string"});

  var ids = myFleetsTo(ctx.destination);
  var fleetSent;
  ids.forEach(function(el, i , a) {
    logTrace(el);
    var fleet = myFleet(el);
    if (fleet.origin == ctx.origin) {
      if (fleetSent == null) {
        fleetSent = fleet;
      }
      if (fleet.id >= fleetSent.id) {
        fleetSent = fleet;
      }
    }
  });
  logTrace(JSON.stringify(fleetSent));

/*  errors:
  You can only move a fleet 5 seconds after it arrives at a location
  */

  ctx.fleetID = fleetSent.id;
  consoleMsg(fleetSent.name + ' checked in' +'<br>&nbsp;&nbsp;bound for '+ctx.destination);

  //  onarrival
  //
  try {
    assertHas(ctx, {onarrive: "string"});
    var callback = ctx.onarrive;
    delete ctx.onarrive;
    window.setTimeout( function() {
      consoleMsg('on arrival: '+callback);
logTrace();
      var vctx = {};
  vctx.url = serverURL+"/fleet.aspx";
  vctx.msg =  "verifying arrival";
  vctx.onload = "ctxLoadDispatch";
  ctxQueueGet(vctx);
logTrace();
  if (!isSending()) {
logTrace();
    ctx.doneMsg = "fleet has arrived";
    sendQueued(ctx);
  }

logTrace();
      aegis[callback](ctx);

logTrace();
    }, (parseInt(fleetSent.arrival) + 3) * 1000);
  } catch(e) {
    logTrace(e.message);
  }
}

//destination=B38%3A60%3A47%3A21&Scout+Ship=1&units=Scout+Ship&fleet_ch1=9498989699&fleet_ch2=1
//form id="move_fleet_form" method="post" action="fleet.aspx?fleet=618490&view=move_start"a
//<input type="text" class="input-numeric" value="B39:64:08:21" maxlength="12" size="13" onchange="calc_distance()" name="destination" id="destination">
//
//destination=B39%3A73%3A98%3A11&Scout+Ship=1&Cruiser=1&units=Scout+Ship%2CCruiser&fleet_ch1=9498989699&fleet_ch2=1

//function moveFleet(aeData, url, doc)

this.sendMoveFleet = function(ctx)
{
  logTrace();
  console.log(ctx);

  //  if origin got into the context,
  //    it's a returnHome trip
  //
  if (typeof ctx.origin === "string") {
    var fleet = myFleetAt(ctx.origin);
    ctx.fleetID = fleet.id;
  }

  var units = [];
  var fleetID = ctx.fleetID,
      data = ctx.data;

  if (data.destination == null) {
    consoleMsg('sendMoveFleet: no destination!', "errMsg");
    console.log('sendMoveFleet: no destination!');
    return;
  }
//  console.log(JSON.stringify(data));
  for (var k in data) {
    console.log(k);
    console.log(data[k]);
    if (k != 'destination' && k != 'fleet_ch1' && k != 'fleet_ch2') {
      units.push(k);
    }
  }
  data.units = units.join(',');

  if (data.fleet_ch1 == null) {
    data.fleet_ch1 = GM_getValue("moveFleet:fleet_ch1:"+playerID, null);
    if (data.fleet_ch1 == null) {
      console.log("invalid fleet_ch1!");
      consoleMsg("unknown fleet_ch1!<br>try moveFleetFromForm first", "errMsg");
      return;
    }
  }
  if (data.fleet_ch2 == null) {
    data.fleet_ch2 = 1;
  }

  var postData = $.param(data); //begginning to love jquery
  console.log('sendMoveFleet '+fleetID + " : " + postData);

  GM_xmlhttpRequest({
    method: "POST",
    url: serverURL + '/fleet.aspx?fleet=' +fleetID + "&view=move_start",
    data: postData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    timeout: 15000,
    ontimeout: function(response) {
      console.log("ontimeout :"+response);
      consoleMsg('ae svr timeout, resend', "errMsg");
//      sendMoveFleet(fleetID, data);
    },
    onerror: function(response) {
      console.log("onerror :"+response);
    },
    onload: function(response) {
      logTrace();
      ctx.html = response.responseText;

      ctx = ctxResponseDoc(ctx);
      var el = ctx.doc.getElementsByClassName("error");
      if (el != null && el.length > 0) {
        consoleMsg('problem with spacedocks!<br>&nbsp;&nbsp;' + el[0].textContent, "errorMsg");
        console.log("moveFleet error: "+el[0].textContent);
      } else if (response.responseText.indexOf("Fleet movement started") > -1) {
        consoleMsg('fleet embarked', "noticeMsg");

//        document.location.href = serverURL + "/fleet.aspx";
        ctx.url = serverURL + '/fleet.aspx';
        ctx.destination = data.destination;
        ctx.ondispatch = "ctxCheckFleet";
        ctxLoadDispatch(ctx);

      }
    }
  });
}

/*  display a countdown until server time becomes elThen.title time
 */
function displayTimeCountdown(elThen)
{
  var thenTime = elThen.getAttribute("title");
  var mThen = new moment( thenTime );
  elThen.innerHTML = mThen.format("YYYY/MM/DD HH:mm:ss");

  mCST =  CurrentServerTime();
  var diff = moment.duration(mThen.diff( CurrentServerTime() ));

  var msgClass = "debugMsg";
  if (diff.asSeconds() < 10) {
    msgClass = "panicMsg";
  } else if (diff.asSeconds() < 60) {
    msgClass = "errMsg";
  } else if (diff.asSeconds() < 120) {
    msgClass = "infoMsg";
  }
  elThen.innerHTML += '<br><span class="'+msgClass+'"><b>'+ 
    diff.format("h [hrs] m [min] s [sec]") + "</b></span>";
}

function moveFleetFromForm()
{
  var fleetID;
  var el = document.URL.match(/fleet\.aspx\?fleet=(\d+)&view=move/);
  if (el == null) {
    consoleMsg("use move fleet form", "errMsg");
    return;
  } else {
    fleetID = el[1];
  }
  var data= {};
  var tbxMsg = [];

  var start = document.getElementById('start');
  start = start.textContent;

  var el = document.getElementById('destination');

  // set up post data
  //
  var el = document.getElementById('destination');
  if (el != null && el.value != start && el.value.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
    data.destination = el.value;
  } else {
    consoleMsg("invalid destination!", "errMsg");
    return;
  }
  ships.forEach(function(ship, i, ar) {
    var el = document.getElementById('quant'+ship);
    if (el != null) {
      if (el.value > 0) {
        data[ship] = el.value;
        tbxMsg.push(ship + ": "+el.value);
      }
    }
  });

  var el = document.getElementsByName('fleet_ch1');
  if (el != null) { 
    data.fleet_ch1=el[0].value;
    var prevVal = GM_getValue("moveFleet:fleet_ch1:"+playerID);
    if (prevVal != data.fleet_ch1) {
      console.log("old fleet_ch1: "+prevVal);
    }
    console.log("fleet_ch1:"+data.fleet_ch1);
    GM_setValue("moveFleet:fleet_ch1:"+playerID, data.fleet_ch1);
  }
  el = document.getElementsByName('fleet_ch2');
  if (el != null) {
    data.fleet_ch2=el[0].value;
  }

  //  callback for sending post
  //
  var sendPost = (function(f, d) {
    return function () {
      console.log('calling sendMoveFleet '+f +" : "+d);
      sendMoveFleet({fleetID:f, data: d});
    };
  })(fleetID, data);

  // validate the time
  //
  var curServerTime = document.getElementById('server-time');
  var inputTime = document.getElementById('moveFleetTime');
  var mDepart = new moment(inputTime.value);

  var mServerTime = new moment(curServerTime.innerHTML);
  if (!mDepart.isValid()) {
    consoleMsg('invalid time!', "errorMsg");
    return;
  }
  if (mDepart.isBefore(mServerTime)) {
    consoleMsg('time in the past!', "errorMsg");
    return;
  }

  //  set up the delay
  //
  var timer;
  var cbDisplayCountdown;

  var delayedPost = (function(curServerTime, mDepart,sendPost) {
    var that = this;
    this.tick = function() {
      var mServerTime = new moment(curServerTime.innerHTML);
      if (mServerTime.isSame(mDepart) || mServerTime.isAfter(mDepart)) {
        console.log('calling sendpost');
        sendPost();
      } else {
        timer = window.setTimeout(function() { that.tick(); }, 1000);
        cbDisplayCountdown();
      }

    };
    return this.tick;
  })(curServerTime, mDepart, sendPost);

  //  visual elements
  //
  consoleMsg('delayed fleet move set for <br>' +
      mDepart.diff(mServerTime, 'seconds') + " seconds from now","infoMsg");

  inputTime.setAttribute('disabled', 'disabled');
  inputTime.className = 'aegisToolbox-text-set';

  var div = document.createElement("div");
  var btn = document.createElement("span");
  btn.id = 'cancelMoveButton';
  btn.className = 'aegisToolbox-button';
  btn.innerHTML = "Cancel";

  consoleMsg(tbxMsg.join(","));
  var spanTime = document.createElement("span");
  spanTime.className = 'aegisToolbox-text';
  spanTime.setAttribute('title', inputTime.value);

  cbDisplayCountdown = (function (elThen) {
    return function () {
      displayTimeCountdown(elThen);
    };
  })(spanTime);

  cbDisplayCountdown();
  
  var span = document.createElement("span");
  span.className = 'aegisToolbox-text';
  span.innerHTML = "destination: "+data.destination +"<br>"+ tbxMsg.join("<br>");

  var cancelClick = function() {
    window.clearTimeout(timer); 

    show(inputTime);
    inputTime.className = 'aegisToolbox-text';
    inputTime.removeAttribute('disabled');

    inputTime.parentNode.removeChild(div);
    consoleMsg("delayed fleet movement canceled","infoMsg");
  };
  registerEvent(btn, "click", cancelClick);

  div.appendChild(document.createElement("br"));
  div.appendChild(btn);
  div.appendChild(document.createElement("br"));
  div.appendChild(spanTime);
  div.appendChild(span);
  inputTime.parentNode.appendChild(div);
  hide(inputTime);

  delayedPost();

}

/*  restore visiblity style settings if cached
 *  and class 
 */
function restoreToggle(id)
{
  var value;
  value = GM_getValue("setting:hidden:"+id, 0);
//  logTrace(id + ":" +value);
  if (value) {
    $("#"+id).hide();
  }
}
function restoreClass(id) 
{
  value = GM_getValue("setting:class:"+id);
//  logTrace(id + ":" +value);
  if (value != null) {
    $("#"+id).attr('class', value);
  }
}

this.ConsoleToolbox = function() {
//  logTrace();
  var $toolbox = $("#aegisConsole-Toolbox");
  if (! $toolbox.length) {
    $toolbox = $(document.createElement("div"))
      .attr({id: "aegisConsole-Toolbox"})
      .attr('class', 'aegisConsole-Toolbox');
    /*
      .hover( function () {
        $(this).fadeTo(0,1);
      }, function() {
        $(this).fadeTo(0, 0.7);
      });
      */

  this.tbxSection = function(txt) {
    var id = "tbx"+txt.replace(/ /,"");

    var $div = $(document.createElement("div"))
      .attr({id: id})
      .attr('class', 'aegisToolbox');

    $(document.createElement("div"))
      .attr('class', 'aegisToolbox-Section')
      .html(txt)
      .click( function() {
        if ($("#aegisConsole-Container").hasClass('noclick')) {
          $("#aegisConsole-Container").removeClass('noclick');
        } else {
          $div.toggle();
          GM_setValue('setting:hidden:'+id, $div.is(':hidden'));
        }
      })
      .appendTo($toolbox);

     $div.appendTo($toolbox);

    return $div;
  }

  var $tbxScan = tbxSection('Scan');

    $( document.createElement('span') )
      .attr({id:'btnSendQCancel', class: 'aegisToolbox-button'})
      .html( '   Cancel   ' )
      .click( function() {
        sendQ.clear();
        $( this ).hide();
        consoleMsg('cancelled', 'infoMsg');
      })
    .hide()
      .appendTo( $tbxScan );

//  Scan region
    $( document.createElement('span') )
      .attr('class', 'aegisToolbox-button')
      .html( 'Scan Region')
      .click( function() {
        var title = $('#curGalReg').html();
        if (typeof title === "string") {
          document.title = title + ' scan';
          scanRegion({region:title});
        } else {
          consoleMsg("no region selected!","errMsg");
        }
      })
      .appendTo($tbxScan);

    $( document.createElement('span') )
      .attr({id:'curGalReg'})
      .attr('class','curGalReg')
      .appendTo($tbxScan);

    $( document.createElement('span') )
      .attr('class', 'aegisToolbox-button')
      .html( 'Scan Base Regions')
      .click( function() {
        document.title = 'Scan Bases';
        var locs = JSON.parse(GM_getValue('myBases',"[]"));
        locs.forEach(function(el,i,a) {
          scanRegion({region:el, skipSend: 1});
        });
        sendQueued({doneMsg: "completed scan of bases"});

        $( document.createElement('span') )
          .attr({id:'btnCancel', class: 'aegisToolbox-button'})
          .html( ' Cancel ' )
          .click( function() {
            sendQ.clear();
            $( this ).remove();
          })
        .insertAfter( $( this ) );
      })
      .appendTo($tbxScan);

  var $tbxFleet = tbxSection('Fleet Operations');
// delayed move fleet    
    $(document.createElement('span'))
      .attr('id','btnTimedMoveFleet')
      .attr('class','aegisToolbox-button')
      .html(' Timed Move Fleet ')
      .click( function() { moveFleetFromForm(); })
      .appendTo($tbxFleet);

    var mST = new moment(new Date(
          $('#server-time').attr("title")
          ));
    mST.add(10, 'seconds');

    $( document.createElement('input') )
      .attr('id','moveFleetTime')
      .attr('name','moveFleetTime')
      .attr('class','aegisToolbox-text')
      .attr("type", "text")
      .attr("value", mST.format("YYYY/MM/DD HH:mm:ss"))
      .change(function() {
        console.log($(this).val());
      })
      .appendTo($tbxFleet);

// move scout
//
    $( document.createElement('span') )
      .attr('id','btnMoveScout')
      .attr('class','aegisToolbox-button wideRight')
      .html('     Move Scout      ')
      .click( function () { 
        moveScout({origin: $('#moveScoutFrom').val(),
          destination: $('#moveScoutTo').val()
        });
      })
      .appendTo($tbxFleet);
    

    $( document.createElement('span') )
      .html("From: ")
      .attr('class', 'aegisToolbox-label')
      .appendTo($tbxFleet);

    $( document.createElement('input') )
      .attr({id:'moveScoutFrom'})
      .attr('name','moveScoutFrom')
      .attr('maxlength','12')
      .attr('class', 'reset-this aegisLoc hasLabel')
      .attr("type", "text")
      .change(function() {
        GM_setValue('setting:val:'+$(this).attr('id'), $(this).val());
      })
      .appendTo($tbxFleet);

    $(document.createElement('br')).appendTo($tbxFleet);

    $( document.createElement('span') )
      .html("To: ")
      .attr('class', 'aegisToolbox-label')
      .appendTo($tbxFleet);

    $(document.createElement('input'))
      .attr({id: 'moveScoutTo'})
      .attr('maxlength','12')
      .attr('name','moveScoutTo')
      .attr('class','reset-this aegisLoc hasLabel')
      .attr("type", "text")
      .change(function() {
        GM_setValue('setting:val:'+$(this).attr('id'), $(this).val());
      })
      .appendTo($tbxFleet);

    $( document.createElement('span') )
      .attr('id','btnDoIt')
      .attr('class','aegisToolbox-button wideRight')
      .html('     Do It      ')
      .click( function () {
        aegis['doit']();
      }).appendTo( tbxSection('Devel') );

     var $tbxConsole = tbxSection('Console');
    ConsoleConsole().appendTo( $tbxConsole );
        $tbxConsole.resizable();
//    ConsoleConsole().appendTo( tbxSection('Console') );

    
  }
  return $toolbox;
}

this.ConsoleConsole = function() {
//  logTrace();
  var $console = $("#aegisConsole");
  if (! $console.length) {
//    var $hdr = tbxSection('Console');

    $console = $(document.createElement("div"))
      .attr({id: "aegisConsole", class: 'aegisConsole'})
      .mousedown( function(e) {
        $(this).data("downPos", {x:e.pageX, y:e.pageY});
      })
      .mouseup(function(e) {
        var downPos = $(this).data().downPos;
        $(this).removeData("downPos");
        if (downPos.x == e.pageX && downPos.y == e.pageY) {
          consoleClear();
        /*
          // toggle console size
          var $el = $("#aegisConsole");
          var m = $el.attr('class').match(/^(.*?)(-small)?$/);
          if (typeof m[2] === "string") {
            $el.attr('class', m[1]);
          } else if (typeof m[1] === "string") {
            $el.attr('class', m[1] + '-small');
          }
          GM_setValue("setting:class:aegisConsole", $el.attr('class'));
          */
        }
      })
      .html( GM_getValue('aegisConsole:'+getTabID(),
            "tabID: "+getTabID()) )
        /*
    $(document.createElement("div"))
      .attr({id: "aegisConsole-Content", class: 'aegisConsole-Content'})
      .appendTo($console);
      */
  }
  return $console;

}

this.consoleClear = function() {
  $("#aegisConsole").html('');
  GM_setValue('aegisConsole:'+getTabID(), '');
}

this.consoleMsg = function(msg, level)
{
  if (typeof(msg) !== "undefined") {
    console.log("[Console] >",msg);
    if (typeof(level) == "string") {
      msg = "<span class='"+level+"'>"+msg+"</span>";
    }

    //      msg = msg + "<br>" + $console.html();
    $("#aegisConsole").prepend(msg + "<br>");
    GM_setValue('aegisConsole:'+getTabID(), $("#aegisConsole").html());
  } else {
    console.log('consolMsg: '+typeof(msg));
  }
}

this.makeConsole = function () {
  if (!document.location.href.match(/\/(.+?).astroempires.com/)) { return; }
  logTrace();

//  logTrace();

  var $hdr = $(document.createElement("div"))
    .attr({id: "aegisConsole-Header"})
    .attr("class", "aegisConsole-Header")
    .html("<b id='aegis-tag'>aegis v"+version+"</b>")
    .click(function() {
      if ($("#aegisConsole-Container").hasClass('noclick')) {
        $("#aegisConsole-Container").removeClass('noclick');
      } else {
        var $tbx = ConsoleToolbox();
        $tbx.toggle();
        GM_setValue('setting:hidden:'+ $tbx.attr('id'), $tbx.is(':hidden'));
      }
    });

  var $container = $("#aegisConsole-Container");
    $container.resizable();
  if ($container.length == 0) {
    $container = $(document.createElement("div"))
      .attr({id:"aegisConsole-Container"})
      .addClass("aegisConsole-Container")
      .append( $hdr )
      .append( ConsoleToolbox() )
      .prependTo('body');

    $container.draggable({
        cancel: "#aegisConsole, input, span",
        start: function(event, ui) {
          $(this).addClass('noclick');
        },
        stop: function(event, ui) {
          GM_setValue("setting:top", $(this).position().top);
          GM_setValue("setting:left", $(this).position().left);
        }
    });

// persist classes
//   hidden state
//   inpute values
//   position

    restoreClass('aegisConsole');
    //$(".aegisToolbox").hide();
    $(".aegisToolbox").each(function(i) { 
      restoreToggle($(this).attr('id'));
    });
    restoreToggle(ConsoleToolbox().attr('id'));

    $("input").each(function(i) {
      var id = $(this).attr('id');
      var val = GM_getValue("setting:val:"+id, null);
      if (val != null) {
        $( "#"+id ).val(val);
      }
    });

    $container.css('top', GM_getValue("setting:top", 7));
    $container.css('left', GM_getValue("setting:left", 7));
  }

  /*
  var re = new RegExp(/([A-Za-z][0-9]{2}):([0-9]{2})/);
  var gr = re.exec(decodeURIComponent(document.URL));
  if (gr.length) {
    $( '#curGalReg' ).html(gr[1]+":"+gr[2]);
  }
  $("#getLocation").change(function() {
    console.log('getLoc changed');
    var gr = re.exec( $(this).val() );
    if (gr.length) {
      $( '#curGalReg' ).html(gr[1]+":"+gr[2]);
    }
  });
*/
  updateGalaxyRegion();
};

function myTimeTimer()
{
  var now = new Date();
  myTime=now.formatDate('D jS M @ g:i:s a');
  elem=document.getElementById('my-time');
  elem.innerHTML=myTime;
  var t = window.setTimeout(myTimeTimer, 1000);
}

function replaceTime(doc)
{
  elem=doc.getElementById('server-time');
  var serverTime = elem.getAttribute("title");
  //    elem.id = "old-server-time";
  //    elem.innerHTML = "<span id='server-time' title='"+serverTime+"'></span>&nbsp&nbsp&nbsp&nbsp<span id='my-time'></span>";
  //myTimeTimer();

  for(n=1;n<=500;n++)
  {
    elem=doc.getElementById('timer'+n);
    if (!elem)
    {
      break;
    }
    elem.id = 'blah'+n;

    s=elem.title;
    var newElement, endTime;
    var d = new Date();
    var now = new Date();
    if (elem)
    {
      if(s<=0)
      {
        endTime="-"
      }
      else
      {
        d.setTime(d.getTime()+(s*1000));
        tempdate = new Date();
        tempdate.setDate(tempdate.getDate()+1)
          if(now.toLocaleDateString() == d.toLocaleDateString() )
          {
            endTime="Today @ "+d.formatDate('g:i:s a');
          }
          else if(tempdate.toLocaleDateString() == d.toLocaleDateString())
          {
            endTime="Tomorrow @ "+d.formatDate('g:i:s a');
          }
          else
          {
            endTime=d.formatDate('D jS M @ g:i:s a');
          }
      }
      elem.innerHTML = "<b><span id='timer"+n+"' title='"+ s +"'>-</span></b><br><nobr><span id='done"+n+"' style='font-size: xx-small; color: "+getAgeCol(s)+"'>" + endTime + "</span></nobr>"
    }
  }
};

// formatDate :
// a PHP date like function, for formatting date strings
// authored by Svend Tofte <www.svendtofte.com>
// the code is in the public domain
//
// see http://www.svendtofte.com/javascript/javascript-date-string-formatting/
// and http://www.php.net/date
//
// thanks to
//  - Daniel Berlin <mail@daniel-berlin.de>,
//    major overhaul and improvements
//  - Matt Bannon,
//    correcting some stupid bugs in my days-in-the-months list!
//  - levon ghazaryan. pointing out an error in z switch.
//  - Andy Pemberton. pointing out error in c switch
///
// input : format string
// time : epoch time (seconds, and optional)
//
// if time is not passed, formatting is based on
// the current "this" date object's set time.
//
// supported switches are
// a, A, B, c, d, D, F, g, G, h, H, i, I (uppercase i), j, l (lowecase L),
// L, m, M, n, N, O, P, r, s, S, t, U, w, W, y, Y, z, Z
//
// unsupported (as compared to date in PHP 5.1.3)
// T, e, o

Date.prototype.formatDate = function (input,time) {

  var daysLong =    ["Sunday", "Monday", "Tuesday", "Wednesday",
      "Thursday", "Friday", "Saturday"];
  var daysShort =   ["Sun", "Mon", "Tue", "Wed",
      "Thu", "Fri", "Sat"];
  var monthsShort = ["Jan", "Feb", "Mar", "Apr",
      "May", "Jun", "Jul", "Aug", "Sep",
      "Oct", "Nov", "Dec"];
  var monthsLong =  ["January", "February", "March", "April",
      "May", "June", "July", "August", "September",
      "October", "November", "December"];

  var switches = { // switches object

    a : function () {
      // Lowercase Ante meridiem and Post meridiem
      return date.getHours() > 11? "pm" : "am";
    },

    A : function () {
      // Uppercase Ante meridiem and Post meridiem
      return (this.a().toUpperCase ());
    },

    B : function (){
      // Swatch internet time. code simply grabbed from ppk,
      // since I was feeling lazy:
      // http://www.xs4all.nl/~ppk/js/beat.html
      var off = (date.getTimezoneOffset() + 60)*60;
      var theSeconds = (date.getHours() * 3600) +
        (date.getMinutes() * 60) +
        date.getSeconds() + off;
      var beat = Math.floor(theSeconds/86.4);
      if (beat > 1000) beat -= 1000;
      if (beat < 0) beat += 1000;
      if ((String(beat)).length == 1) beat = "00"+beat;
      if ((String(beat)).length == 2) beat = "0"+beat;
      return beat;
    },

    c : function () {
      // ISO 8601 date (e.g.: "2004-02-12T15:19:21+00:00"), as per
      // http://www.cl.cam.ac.uk/~mgk25/iso-time.html
      return (this.Y() + "-" + this.m() + "-" + this.d() + "T" +
          this.H() + ":" + this.i() + ":" + this.s() + this.P());
    },

    d : function () {
      // Day of the month, 2 digits with leading zeros
      var j = String(this.j());
      return (j.length == 1 ? "0"+j : j);
    },

    D : function () {
      // A textual representation of a day, three letters
      return daysShort[date.getDay()];
    },

    F : function () {
      // A full textual representation of a month
      return monthsLong[date.getMonth()];
    },

    g : function () {
      // 12-hour format of an hour without leading zeros, 1 through 12!
      if (date.getHours() == 0) {
        return 12;
      } else {
        return date.getHours()>12 ? date.getHours()-12 : date.getHours();
      }
    },

    G : function () {
      // 24-hour format of an hour without leading zeros
      return date.getHours();
    },

    h : function () {
      // 12-hour format of an hour with leading zeros
      var g = String(this.g());
      return (g.length == 1 ? "0"+g : g);
    },

    H : function () {
      // 24-hour format of an hour with leading zeros
      var G = String(this.G());
      return (G.length == 1 ? "0"+G : G);
    },

    i : function () {
      // Minutes with leading zeros
      var min = String (date.getMinutes ());
      return (min.length == 1 ? "0" + min : min);
    },

    I : function () {
      // Whether or not the date is in daylight saving time (DST)
      // note that this has no bearing in actual DST mechanics,
      // and is just a pure guess. buyer beware.
      var noDST = new Date ("January 1 " + this.Y() + " 00:00:00");
      return (noDST.getTimezoneOffset () ==
          date.getTimezoneOffset () ? 0 : 1);
    },

    j : function () {
      // Day of the month without leading zeros
      return date.getDate();
    },

    l : function () {
      // A full textual representation of the day of the week
      return daysLong[date.getDay()];
    },

    L : function () {
      // leap year or not. 1 if leap year, 0 if not.
      // the logic should match iso's 8601 standard.
      // http://www.uic.edu/depts/accc/software/isodates/leapyear.html
      var Y = this.Y();
      if (
          (Y % 4 == 0 && Y % 100 != 0) ||
          (Y % 4 == 0 && Y % 100 == 0 && Y % 400 == 0)
         ) {
           return 1;
         } else {
           return 0;
         }
    },

    m : function () {
      // Numeric representation of a month, with leading zeros
      var n = String(this.n());
      return (n.length == 1 ? "0"+n : n);
    },

    M : function () {
      // A short textual representation of a month, three letters
      return monthsShort[date.getMonth()];
    },

    n : function () {
      // Numeric representation of a month, without leading zeros
      return date.getMonth()+1;
    },

    N : function () {
      // ISO-8601 numeric representation of the day of the week
      var w = this.w();
      return (w == 0 ? 7 : w);
    },

    O : function () {
      // Difference to Greenwich time (GMT) in hours
      var os = Math.abs(date.getTimezoneOffset());
      var h = String(Math.floor(os/60));
      var m = String(os%60);
      h.length == 1? h = "0"+h:1;
      m.length == 1? m = "0"+m:1;
      return date.getTimezoneOffset() < 0 ? "+"+h+m : "-"+h+m;
    },

    P : function () {
      // Difference to GMT, with colon between hours and minutes
      var O = this.O();
      return (O.substr(0, 3) + ":" + O.substr(3, 2));
    },

    r : function () {
      // RFC 822 formatted date
      var r; // result
      //  Thu         ,     21               Dec              2000
      r = this.D() + ", " + this.d() + " " + this.M() + " " + this.Y() +
        //    16          :    01          :    07               0200
        " " + this.H() + ":" + this.i() + ":" + this.s() + " " + this.O();
      return r;
    },

    s : function () {
      // Seconds, with leading zeros
      var sec = String (date.getSeconds ());
      return (sec.length == 1 ? "0" + sec : sec);
    },

    S : function () {
      // English ordinal suffix for the day of the month, 2 characters
      switch (date.getDate ()) {
        case  1: return ("st");
        case  2: return ("nd");
        case  3: return ("rd");
        case 21: return ("st");
        case 22: return ("nd");
        case 23: return ("rd");
        case 31: return ("st");
        default: return ("th");
      }
    },

    t : function () {
      // thanks to Matt Bannon for some much needed code-fixes here!
      var daysinmonths = [null,31,28,31,30,31,30,31,31,30,31,30,31];
      if (this.L()==1 && this.n()==2) return 29; // ~leap day
      return daysinmonths[this.n()];
    },

    U : function () {
      // Seconds since the Unix Epoch (January 1 1970 00:00:00 GMT)
      return Math.round(date.getTime()/1000);
    },

    w : function () {
      // Numeric representation of the day of the week
      return date.getDay();
    },

    W : function () {
      // Weeknumber, as per ISO specification:
      // http://www.cl.cam.ac.uk/~mgk25/iso-time.html

      var DoW = this.N ();
      var DoY = this.z ();

      // If the day is 3 days before New Year's Eve and is Thursday or earlier,
      // it's week 1 of next year.
      var daysToNY = 364 + this.L () - DoY;
      if (daysToNY <= 2 && DoW <= (3 - daysToNY)) {
        return 1;
      }

      // If the day is within 3 days after New Year's Eve and is Friday or later,
      // it belongs to the old year.
      if (DoY <= 2 && DoW >= 5) {
        return new Date (this.Y () - 1, 11, 31).formatDate ("W");
      }

      var nyDoW = new Date (this.Y (), 0, 1).getDay ();
      nyDoW = nyDoW != 0 ? nyDoW - 1 : 6;

      if (nyDoW <= 3) { // First day of the year is a Thursday or earlier
        return (1 + Math.floor ((DoY + nyDoW) / 7));
      } else {  // First day of the year is a Friday or later
        return (1 + Math.floor ((DoY - (7 - nyDoW)) / 7));
      }
    },

    y : function () {
      // A two-digit representation of a year
      var y = String(this.Y());
      return y.substring(y.length-2,y.length);
    },

    Y : function () {
      // A full numeric representation of a year, 4 digits

      // we first check, if getFullYear is supported. if it
      // is, we just use that. ppks code is nice, but wont
      // work with dates outside 1900-2038, or something like that
      if (date.getFullYear) {
        var newDate = new Date("January 1 2001 00:00:00 +0000");
        var x = newDate .getFullYear();
        if (x == 2001) {
          // i trust the method now
          return date.getFullYear();
        }
      }
      // else, do this:
      // codes thanks to ppk:
      // http://www.xs4all.nl/~ppk/js/introdate.html
      var x = date.getYear();
      var y = x % 100;
      y += (y < 38) ? 2000 : 1900;
      return y;
    },


    z : function () {
      // The day of the year, zero indexed! 0 through 366
      var s = "January 1 " + this.Y() + " 00:00:00 GMT" + this.O();
      var t = new Date(s);
      var diff = date.getTime() - t.getTime();
      return Math.floor(diff/1000/60/60/24);
    },

    Z : function () {
      // Timezone offset in seconds
      return (date.getTimezoneOffset () * -60);
    }

  }

  function getSwitch(str) {
    if (switches[str] != undefined) {
      return switches[str]();
    } else {
      return str;
    }
  }

  var date;
  if (time) {
    var date = new Date (time);
  } else {
    var date = this;
  }

  var formatString = input.split("");
  var i = 0;
  while (i < formatString.length) {
    if (formatString[i] == "%") {
      // this is our way of allowing users to escape stuff
      formatString.splice(i,1);
    } else {
      formatString[i] = getSwitch(formatString[i]);
    }
    i++;
  }

  return formatString.join("");
}


// Some (not all) predefined format strings from PHP 5.1.1, which
// offer standard date representations.
// See: http://www.php.net/manual/en/ref.datetime.php#datetime.constants
//

// Atom      "2005-08-15T15:52:01+00:00"
Date.DATE_ATOM    = "Y-m-d%TH:i:sP";
// ISO-8601  "2005-08-15T15:52:01+0000"
Date.DATE_ISO8601 = "Y-m-d%TH:i:sO";
// RFC 2822  "Mon, 15 Aug 2005 15:52:01 +0000"
Date.DATE_RFC2822 = "D, d M Y H:i:s O";
// W3C       "2005-08-15 15:52:01+00:00"
Date.DATE_W3C     = "Y-m-d%TH:i:sP";


function getAgeCol(age) {
  var col = '#461B7E'; // 72 hours +
  if (age <= 3600)
    col = '#FFFFFF'; // 1 hour
  else if (age <=10800)
    col = '#FFFFFF'; // 3 hours
  else if (age <=21600)
    col = '#9E7BFF'; // 6 hours
  else if (age <=43200)
    col = '#9172EC'; // 12 hours
  else if (age <=86400)
    col = '#8467D7'; // 24 hours
  else if (age <=172800)
    col = '#7A5DC7'; // 48 hours
  else if (age <=259200)
    col = '#461B7E'; // 72 hours
  return col;
}

function toFixed(value, precision) {
  var power = Math.pow(10, precision || 0);
  return String(Math.round(value * power) / power);
}

function xml2string(node) {
  if (typeof(XMLSerializer) !== 'undefined') {
    var serializer = new XMLSerializer();
    return serializer.serializeToString(node);
  } else if (node.xml) {
    return node.xml;
  }
}

/********************************* ae data parsing functions *****/

function matchFirstPos(string, re)
{
  if (string == null || re == null) {
    return null;
  }
  var m = string.match(re);
  if (m != null && m.length > 0) {
    return m[1];
  } else {
    return null;
  }
}

function fieldRightOfSlash(string)
{
  var m = string.match(/([\d.]+).*?\/.*?(\d+)/);
  if (m != null && m.length > 2) {
    return m[2];
  }
}

function fieldPlayerFromLink(aeData, link)
{
  var player = {};
  console.log('player from link '+link.innerHTML);
  if (link.href.match(/profile\.aspx\?player=(\d+)$/)) {
    player['id'] = link.getAttribute("href").match(/=(\d+)$/)[1];
    player['level'] = matchFirstPos(link.getAttribute("title"), /level ([\d+\.,]+)/);
    if (player['level'] == null) {
      delete player['level'];
    }

    if (link.textContent.match(/\[.*?\]/)) {
      player['guild'] = {tag: link.textContent.match(/(\[.*?\])/)[1] };
      player['name'] = link.textContent.match(/\]\s*?(\S.*?)$/)[1];
    } else {
      player['name'] = link.textContent;
    }
    var id = player['id'];
    aeData.add('player',player);
    return id;
  } else {
    return null;
  }
}

function checkDaysOld(ctx)
{
  if (!tryAssertHas(ctx, {doc: "object", data: "object"})) { return; };
  var daysOld = null;
  var center = ctx.doc.getElementsByTagName('center');
  for (i = 0; i < center.length; i++) {
    //console.log(center[i].textContent)
    if (center[i].textContent.match(/Recorded data from (\d+)/)) {
      daysOld = center[i].textContent.match(/Recorded data from (\d+)/)[1];
      ctx.data.daysOld = daysOld;
    }
  }
  return daysOld;
}


//function parseMapFleet(aeData, table, location, follow) {
function parseMapFleet(ctx) {
  if (!tryAssertHas(ctx, {data: "object",  
    table: "object", follow: "string"})) { return; }
 
  if (ctx.location) {
    consoleMsg('parseMapFleet '+ctx.location);
  }

//  console.log(xml2string(table));

  var tr = ctx.table.getElementsByTagName('tr');

  //ctx.data['fleet'] = [];
  //console.log(tr.length);

  for(r=0; r<tr.length; r++){
    var dtRow = {};

    dtRow['location'] = ctx.location;

    var tds = tr[r].getElementsByTagName('td');
    if (tds != null && tds.length >= 4){
      var i = 0; 
      var a = tds[i++].getElementsByTagName('a');
      if (a != null && a.length > 0) {
        dtRow['id'] = matchFirstPos(a[0].href, /fleet\.aspx\?fleet=(\d+)/);
        dtRow['name'] = a[0].innerHTML;
      }
      var a = tds[i++].getElementsByTagName('a');
      if (a != null && a.length > 0) {
        dtRow['owner'] = fieldPlayerFromLink(ctx.data, a[0]);
      }

      if (ctx.location == null) {
        var sortKey = tds[i++].getAttribute("sorttable_customkey");
        if (sortKey != null) {
          dtRow['location'] = sortKey;
        }

      }
      var sortKey = tds[i++].getAttribute("sorttable_customkey");
      if (sortKey != null) {
        dtRow['arrival'] = sortKey;
      }

      var sortKey = tds[i++].getAttribute("sorttable_customkey");
      if (sortKey != null) {
        dtRow['size'] = sortKey;
      }

    }

    if (Object.keys(dtRow).length > 0 && dtRow['id'] != null) {
      if (ctx.follow == "fleet" || ctx.follow == "all") {
        ctxQueueGet({url: "fleet.aspx?fleet="+dtRow['id'],
          msg: "scanning fleet "+dtRow['id']});
      }

      ctx.data.add('fleet',dtRow);
    }
  }
}

function parseScanner(ctx){
  if (!tryAssertHas(ctx, 
        {data: "object", doc: "object", url: "string", follow: "string"})
     ) { return; }

  consoleMsg('parseScanner');
  //console.log(xml2string(ctx.document.getElementById('coded_scanners')));
  var table = ctx.doc.getElementById('coded_scanners');
  if (table == null) {
    table = ctx.doc.getElementById('empire_scanners');
    if (table != null) {
      table = table.getElementsByTagName('table')[0];
    }
  }
  ctx.table = table;
  parseMapFleet(ctx);

  console.log(JSON.stringify(ctx.data));
}


function parseFleet(ctx) {
  if (!tryAssertHas(ctx, 
        {data: "object", doc:"object", url: "string", follow: "string"})
     ) { return; }

  var dtRow = {};
  if (ctx.url.match(/fleet.aspx\?fleet=(\d+)&view=move/)) {
    return;
  }
  if (ctx.url.match(/fleet.aspx\?fleet=(\d+)/)) {
    dtRow['id'] = ctx.url.match(/fleet.aspx\?fleet=(\d+)/)[1];
    consoleMsg('parseFleet '+ dtRow['id'] );
  } else {
    var table = ctx.doc.getElementById('fleets-list');
    if (table == null) { return; }
    var tr = table.getElementsByTagName('tbody')[1].getElementsByTagName('tr');
    if (tr == null) { return; }

  //  remove the orphans before we re-populate fleets
  //
  var keys = GM_listValues();
  var key = keys[0];
  for (var i=0; key != null; key=keys[i++] ) {

    if(key.match(/^myfleets?:/)) {
      GM_deleteValue(key);
    }
  }
  
    var dest = {
      add: function(loc, id) {
        if (this[loc] == null) {
          this[loc] = [];
        }
        this[loc].push(id);
      }
    };
    for (i=0; i<tr.length; i++) {
      var fleet = {};
      var td = tr[i].getElementsByTagName('td');
      var a = td[0].getElementsByTagName('a');
      fleet.id = a[0].href.match(/fleet=(\d+)/)[1];
      fleet.name = a[0].textContent;
      fleet.location = td[1].getAttribute('sorttable_customkey');

      fleet.destination = td[2].getAttribute('sorttable_customkey');

      if (fleet.destination != null) {
        fleet.origin = fleet.location;
        delete fleet.location;
        fleet.arrival = td[3].getAttribute('sorttable_customkey');
      } else {
        delete fleet.destination;
      }

      fleet.size = td[4].getAttribute('sorttable_customkey');

      if (td[5].getAttribute('sorttable_customkey').length > 0) {
        fleet.comment = td[5].getAttribute('sorttable_customkey');
      }
//      console.log(JSON.stringify(fleet));
//
//    store fleet information
//
      GM_setValue("myfleet:"+ fleet.id, JSON.stringify(fleet));

      if (fleet.location != null) {
        GM_setValue("myfleet:at:"+ fleet.location, JSON.stringify(fleet));
      }
      if (fleet.destination != null) {
        dest.add(fleet.destination, fleet.id);
      }
    }
    for (var i in dest) {
      if (i != "add") {
        logTrace(i + ":" + JSON.stringify(dest[i]));
        GM_setValue("myfleets:to:"+ i, JSON.stringify(dest[i]));
      }
    }
    return;
  }

  var tables = ctx.doc.getElementsByTagName('table');
  var playerAndLoc;
  for (i=0; i<tables.length; i++) {
    if (tables[i].id == "fleet_overview") {
      playerAndLoc = tables[i-1];
    }
  }
  //console.log(xml2string(playerAndLoc));

  //our fleets have either the form for base selection or for movement
  //  just care about nme fleets
  if (playerAndLoc != null && playerAndLoc.getElementsByTagName('form').length > 0) {
    console.log('returning');
    return;
  }
  var rows =  playerAndLoc.getElementsByTagName('tr');
  if (rows != null && rows.length > 1) {
    var cols = rows[1].getElementsByTagName('td');
    if (cols != null && cols.length >= 4) {
      var link = cols[0].getElementsByTagName('a');
      if (link != null && link.length > 0) {
        dtRow['owner'] = fieldPlayerFromLink(ctx.data, link[0]);
      }
      link = cols[1].getElementsByTagName('a');
      if (link != null && link.length > 0) {
        dtRow['location'] = link[0].getAttribute("href").match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];
      }
      //dest
      link = cols[2].getElementsByTagName('a');
      if (link != null && link.length > 0) {
        if (dtRow['location'] != null) {
          dtRow['origin'] = dtRow['location'];
        }
        dtRow['location'] = link[0].getAttribute("href").match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];
      }
      if (cols[3].getAttribute('title') != null && cols[3].getAttribute('title').match(/\d+/)) {
        dtRow['arrival'] = cols[3].getAttribute('title');
      }
    }
  }

  //console.log(xml2string(ctx.document.getElementById('fleet_overview')));

  var fleetTable = ctx.doc.getElementById('fleet_overview').getElementsByTagName('table')[0];
  var tr = fleetTable.getElementsByTagName('tr');
  var ships = {};
  for(r=0; r<tr.length; r++){
    var td = tr[r].getElementsByTagName('td');
    if (td.length > 0) {
      ships[td[0].textContent] = td[1].textContent.match(/([\d\.]+)/g).join("");
    }
  }
  if (Object.keys(ships).length > 0) {
    dtRow['ships'] = ships;
  }

  var fleetSize = ctx.doc.getElementById('fleet_overview').getElementsByTagName('center')[0].textContent;
  dtRow['size'] = fleetSize.match(/(\d+)/g).join("");


  ctx.data.add('fleet',dtRow);
}

function parseAstro(ctx) {
  var location;
  try {
    assertHas(ctx, 
        {data: "object", doc:"object", url: "string", follow: "string"});

    location = ctx.url.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];

    consoleMsg('parseAstro '+location);
  } catch(e) {
    console.log(e);
    return;
  }
  var aRow = {};

  var el = ctx.doc.getElementsByClassName('astro')[0];

  console.log(el.textContent);
  aRow['type'] = el.textContent.match(/(Astro Type: (.*?)Terrain)/)[2];
  aRow['terrain'] = el.textContent.match(/(Terrain: (.*?)Area)/)[2];
  aRow['location'] = location;

  var table = ctx.doc.getElementById('map_base');    
  var dtRow = {};
  if (table !== null) {

    //console.log(xml2string(table));

    var rows = table.getElementsByTagName('table')[0].getElementsByTagName('tr');
    //console.log("hmm" + rows.length);
    for(r=0; r<rows.length; r++){
      var col = rows[r].getElementsByTagName('td');
      if (col != null && col.length > 0) {

        var i = 0;

        var link = col[i++].getElementsByTagName('a')[0];
        dtRow['name'] = link.textContent;
        dtRow['id'] = link.getAttribute('href').match(/=(\d+)$/)[1];
        dtRow['location'] = location;

        link = col[i++].getElementsByTagName('a')[0];
        dtRow['owner'] = fieldPlayerFromLink(ctx.data, link);

        link = col[i++].getElementsByTagName('a')[0];
        if (link != null) {
          dtRow['occupier'] = fieldPlayerFromLink(ctx.data, link);
        }

        link = col[i].getElementsByTagName('a')[0];
        dtRow['economy'] = fieldRightOfSlash(link.textContent);
        dtRow['ownerIncome'] = toFixed(eval(link.textContent) * 100, 2);
      }

    }

    ctx.data.add('base',dtRow);
  }
  ctx.data.add('astro',aRow);

  var mapfleet = ctx.doc.getElementById('map_fleets');
  if (mapfleet != null) {
    ctx.table = mapfleet.getElementsByTagName('table')[0];
    ctx.location = location;
    parseMapFleet(ctx);
  }
}

function parseSystem(ctx) {
  var system;
  try {
    assertHas(ctx, 
        {data: "object", doc:"object", url: "string", follow: "string"});

    system = ctx.url.match(/([A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2})/)[1];

    consoleMsg('parseSystem '+system);
  } catch(e) {
    console.log(e);
    return;
  }
  var astroRow = {};
  var baseRow = {};
  var fleetRow = {};

  var daysOld = checkDaysOld(ctx);

  var table = ctx.doc.getElementsByClassName('system')[0];
  //  console.log(xml2string(table));

  var links = table.getElementsByTagName('a');
  for (li = 0; li < links.length; li++) {
    var link = links[li];
    //    console.log(link.getAttribute('href'));
    var img = link.getElementsByTagName('img')[0];

    if (img != null) {

      astroRow['terrain'] = img.getAttribute("alt");
      var iid = img.getAttribute("id");
      if (iid != null) {
        astroRow['location'] = iid.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];

        if (astroRow['location'].match(/0$/))
        {
          astroRow['type'] = "Planet";
        }
        if (astroRow['location'].match(/[1-4]$/))
        {
          astroRow['type'] = "Moon";
        }
        if (astroRow['terrain'] == "Asteroid Belt") {
          astroRow['type'] = "Asteroid Belt";
        }
        if (astroRow['terrain'] == "Gas Giant") {
          astroRow['type'] = "Gas Giant";
        }

        if (astroRow['terrain'].match(/^Asteroid$/)) {
          astroRow['type'] = "Asteroid";
        }

        //is it a base?
        if (link.getAttribute("href").match(/base\.aspx\?base=/)) {
          baseRow['id'] = link.getAttribute("href").match(/base\.aspx\?base=(\d+)/)[1];
          console.log(baseRow['id']);

          baseRow['location'] = astroRow['location'] ;
          astroRow['base'] = baseRow['id'];

          if (ctx.follow == "base" || ctx.follow == "all") {
            ctxQueueGet({url: link.href, msg: "found base at "+astroRow['location']});
          }
        }

        //for astros with bases, the subsequent 1-3 divs will
        // hold player and fleet info
        var node = link.nextSibling;
        for (next = node; next != null && next.tagName !== "A"; next = next.nextSibling) {
          //console.log("next tag: " + next.tagName);
          if (next.tagName == "DIV") {
            var a = next.getElementsByTagName('a');
            var div =  next.getElementsByTagName('div');
            if (a != null && a.length > 0) {

              var player = fieldPlayerFromLink(ctx.data, a[0]);

              if (baseRow['owner'] != null) {
                baseRow['occupier'] = player;
              } else {
                baseRow['owner'] = player;
              }
            }
            if (div != null && div.length > 0) {
              for (i = 0; i < div.length; i++) {
                var fleet = div[i].getAttribute("title");
                if (fleet != null) {
                  if (!(fleet.match(/Self/))) {
                    var nfo = fleet.match(/Fleet present: ([\d,]+) - Incoming: ([\d,])/);
                    if (nfo != null && nfo.length > 0) {
                      astroRow['unknownFleet'] = nfo[1].match(/\d+/g).join("");
                      astroRow['unknownIncoming'] = nfo[2].match(/\d+/g).join("");

                      //follow the fleet unless already following because of base
                      //
                      if (baseRow['id'] == null || ctx.follow != "base") {
                        if (ctx.follow == "fleet" || ctx.follow == "all") {
                          ctxQueueGet({url: "map.aspx?loc="+astroRow['location'],
                              msg: "found fleet at "+astroRow['location']});
                        }
                      }
                    }
                  }
                }
              }
              //               console.log(JSON.stringify(ctx.data));

            }
          }
        }
        if (Object.keys(baseRow).length > 0 &&
            baseRow['id'] != null && baseRow['owner'] != null) {
              ctx.data.add('base',baseRow);
              baseRow = {};
            }
        ctx.data.add('astro',astroRow);
        astroRow = {};
      }
    }
  }
}

function parseBase(ctx) {
  var baseRow = {};
  try {
    assertHas(ctx, 
        {data: "object", doc: "object", url: "string", follow: "string"});

    if (! ctx.url.match(/base\.aspx\?base=(\d+)(&view=)?$/)) {
      return;
    }

    baseRow['id'] = ctx.url.match(/base\.aspx\?base=(\d+)/)[1];
    consoleMsg('parseBase '+ baseRow['id']);
  } catch(e) {
    logTrace();
    console.log(e);
    return;
  }


  var tables = ctx.doc.getElementsByTagName('table');
  if (tables != null && tables.length > 0) {
    for (i = 0; i < tables.length; i++) {
      var table = tables[i];
      var rows = table.getElementsByTagName('tr');
      /*
         if (rows.length > 1) {
         console.log("rows " + rows.length +
         " 0.cols " +rows[0].getElementsByTagName('th').length +
         " 1.cols " +rows[1].getElementsByTagName('td').length
         );
         }
         */

      if (rows != null && rows.length > 1) {
        var colsTH =  rows[0].getElementsByTagName('th');
        var colsTD =  rows[1].getElementsByTagName('td');

        if (colsTD.length > 4 && colsTH.length == 6) {
          //your base
          var op = colsTH[0].getElementsByTagName('option');
          if (op != null && op.length > 0) {
            var o = op[0];
            for (var i = 0; o != null; o = op[++i]) {
              if (o.getAttribute("selected") == "selected") {
                baseRow['name'] = o.textContent.match(/^\s?((\S+\s?)+\S+)\s?$/)[1];
              }
            }
            for (ih = 1; ih < colsTH.length; ih++) {
              //console.log(colsTH[ih].textContent  + " = " + colsTD[ih - 1].textContent);
              var key = colsTH[ih].textContent;
              if (key == "Location") {
                baseRow['location'] = colsTD[ih - 1].textContent;
              } else if (key == "Trade Routes") {
                baseRow['tradeRoutes'] = colsTD[ih - 1].textContent;
              }
            }

          } else {
            //others base
            for (ih = 0; ih < colsTH.length; ih++) {
              var key = colsTH[ih].textContent;
              if (key == "Base Name") {
                baseRow['name'] = colsTD[ih].textContent.match(/^\s?((\S+\s?)+\S?)\s?$/)[0];
              } else if (key == "Location") {
                baseRow['location'] = colsTD[ih].textContent;
              } else if (key == "Trade Routes") {
                baseRow['tradeRoutes'] = colsTD[ih].textContent;
              }
            }
          }
        }
      }
    }
  }
  var tblCap = ctx.doc.getElementById('base_processing-capacities').getElementsByTagName('table')[0];
  //console.log(xml2string(tblCap));

  var trs = tblCap.getElementsByTagName('tr');
  for (var i = 0; i < trs.length; i++) {
    var tr = trs[i];
    var tds = tr.getElementsByTagName('td');
    if (tds != null && tds.length > 0) {
      if (tds[0].textContent == "Base Owner") {
        var a = tds[1].getElementsByTagName('a');
        if (a != null && a.length > 0) {
          baseRow['owner'] = fieldPlayerFromLink(ctx.data,a[0]);
        }
      } else if (tds[0].textContent == "Economy") {
        baseRow['economy'] = tds[1].textContent;
      } else if (tds[0].textContent == "Owner Income") {
        //        if (tds[1].textContent != baseRow['economy']) {
        baseRow['ownerIncome'] = toFixed(tds[1].textContent / baseRow['economy'] * 100, 2);
        //        }
      }
    }
  }

  // fleets
  //
  var baseFleets = ctx.doc.getElementById('base_fleets');
  if (baseFleets != null) {
    var tblFleets = baseFleets.getElementsByTagName('table');
    if (tblFleets != null && tblFleets.length > 0) {

      ctx.table = tblFleets[0];
      ctx.location = baseRow['location'];
      parseMapFleet(ctx);
    }
  }

  var tblStru = ctx.doc.getElementById('base_resume-structures');
  if (tblStru != null) { 
    tblStru = tblStru.getElementsByTagName('table')[0];
  }

  //structures

  if (tblStru != null) { 
    //  console.log(xml2string(tblStru));

    var struct = {};
    var trs = tblStru.getElementsByTagName('tr');
    for (i = 0; i < trs.length; i++) {
      var tds = trs[i].getElementsByTagName('td');
      if (tds != null && tds.length > 0) {
        var bld = tds[0];
        var bldVal = tds[1];
        if (bld != null && bldVal != null) {
          var name = bld.getElementsByTagName('span');
          var val = bldVal.innerHTML.split("<br>");
          for (j = 0; j < name.length; j++) {
            if (name[j] != null && val[j] != null) {
              struct[name[j].textContent] = val[j];
            }
          }
        }

        var ccJg = tds[2];
        var ccJgVal = tds[3];
        if (ccJgVal != null && ccJgVal.textContent.match(/\d/)) {
          //console.log( ccJgVal.innerHTML);
          var name = ccJg.innerHTML.split("<br>");
          var vals = ccJgVal.innerHTML.split("<br>");
          for (j = 0; j < name.length; j++) {
            if (name[j] != null && vals[j] != null && name[j].length > 0) {
              struct[name[j]] = vals[j];
            }
          }
        }
        var def = tds[4];
        var defVal = tds[5];
        if (def != null && defVal != null) {
          var name = def.getElementsByTagName('span');
          var val = defVal.getElementsByTagName('span');
          for (j = 0; j < name.length; j++) {
            if (name[j] != null && val[j] != null) {
              struct[name[j].textContent] = fieldRightOfSlash(val[j].textContent);
            }
          }
        }
        if (Object.keys(struct).length > 0) {
          baseRow['structures'] = struct;
        }
      }
    }
  }
  ctx.data.add('base',baseRow);
}

function parseEmpire(ctx)
{
  consoleMsg('parseEmpire player '+playerID);
  var baseRow = {};

  var table = ctx.doc.getElementById('empire_events').getElementsByTagName('table')[0];
  var rows = table.getElementsByTagName('tr');
  var locs = [];
  for (i = 0; i < rows.length; i++) {
    var cols = rows[i].getElementsByTagName('td');
    if (cols != null && cols.length > 0) {
      var a = cols[0].getElementsByTagName('a')[0];
      baseRow['name'] = a.textContent;
      baseRow['id'] = a.href.match(/base=(\d+)$/)[1];

      a = cols[1].getElementsByTagName('a')[0];
      baseRow['location'] = a.href.match(/[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)[0];

      //save base locations for scan buttons
      //
      GM_setValue("myBase:"+baseRow['id'], baseRow['location']);
      locs.push(baseRow['location']);

      baseRow['economy'] = fieldRightOfSlash(cols[2].textContent);
      //      baseRow['economy'] = cols[2].textContent;
      baseRow['owner'] = playerID;

      a = cols[3].getElementsByTagName('a')[0];
      var occ = a.href.match(/player=(\d+)/)[1];
      if (occ > 0) {
        baseRow['occupier'] = fieldPlayerFromLink(ctx.data, a);
      }

      ctx.data.add('base',baseRow);
      baseRow={};
    }
  }
  GM_setValue("myBases", JSON.stringify(locs));

}

function parseGuild(ctx)
{
  consoleMsg('parseGuild player '+playerID);
  if (ctx.url.match(/\?guild=(\d+)/)) {
  }
  var playerRow = {};
  var guild = {};
  //guild
  var table=ctx.doc.getElementById('profile_show').getElementsByTagName('table')[0];
  var rows = table.getElementsByTagName('tr');
  if (rows != null && rows.length > 0) {
    guild['name'] = rows[0].textContent.match(/^\s?((\S+\s?)+\S+)\s?$/)[1];
    var match = rows[1].textContent.match(/Guild: (\d+).*?Tag: (\[.*?\])/);
    if (match != null && match.length > 0) {
      guild['id'] = match[1];
      guild['tag'] = match[2];
    }
  }


  //members
  var table=ctx.doc.getElementById('guild_members').getElementsByTagName('table')[0];
  var row;
  var rows = table.getElementsByTagName('tr');
  for (var i=0, row=null; row=rows[i]; i++) {
    var cols  = row.getElementsByTagName('td');
    if (cols != null && cols.length > 0) {
      var link = cols[2].getElementsByTagName('a')[0];
      playerRow['name'] = link.textContent;
      playerRow['id'] = link.getAttribute("href").match(/=(\d+)$/)[1];
      if (cols[3].textContent.match(/(Free|Upgraded)/)) {
        playerRow['upgraded'] = cols[3].textContent;
      }
      if (cols[4].textContent.match(/[\d\.]+/)) {
        playerRow['level'] = cols[4].textContent;
      }
      playerRow['guild'] = guild;
    }
    ctx.data.add('player',playerRow);
    playerRow = {};
  }
}

/*  
 *
 */
function coalesceArray(a,b)
{
  var out = [];
  if (exists(a)) {
    for (var i =0; i < a.length; i++) {
      out.push(a[i]);
    }
  }
  if (exists(b)) {
    for (var i =0; i < b.length; i++) {
      out.push(b[i]);
    }
  }
  return out;
}

function listViewableStars()
{
  var m2 = document.getElementById('map2_Wrapper');
  var normal = document.getElementsByClassName('star-normal');
  var fog = document.getElementsByClassName('star-fog');
  console.log('current: '+unsafeWindow.starsGalaxy + ':' + unsafeWindow.mapCurrentRegion);
  var stars = coalesceArray(normal, fog);

  //    var curReg = unsafeWindow.mapCurrentRegion;
  for (var i =0; i < stars.length; i++) {
    console.log(i + " " + stars[i].id);
  }

  //  unsafeWindow.go2region(76);
}


/*  http://wiki.greasespot.net/Talk:GM_xmlhttpRequest
*/
(function(){
  "use strict";
  var HTMLParser;
  function HTMLParser() {
    this.newDocument = function () {
      var dt;
      dt = document.implementation.createDocumentType("html", "-//W3C//DTD HTML 4.01 Transitional//EN", "http://www.w3.org/TR/html4/loose.dtd");
      this.doc = document.implementation.createDocument('', '', dt);
    };
    this.loadString = function (htmlstring) {
      if (!htmlstring) {
        return false;
      }
      this.newDocument();
      this.doc.appendChild(this.doc.createElement('html'));
      this.doc.documentElement.innerHTML = htmlstring;
      return this.doc;
    };
    return this.newDocument();
  }
}());

/*
 * object prototype will add this to every object
function assert(ctx, types) {
  if (typeof (ctx) !== 'object') {
    throw new Error('invalid context: ' + typeof (ctx));
  }
  if (typeof (types) === 'object') {
    for (var i in types) {
      if (typeof (ctx[i]) !== typeof (types[i])) {
        throw new Error('assertion ' + i + ' requires ' + typeof (types[i]) + ', given ' + typeof (ctx[i]));
      }
    }
  }
}
 */

//  helper
//
function tryAssertHas(ctx, types, skip)
{
  try {
    assertHas(ctx,types);
    return 1;
  } catch(e) {
    if (typeof skip === "undefined") {
      logTrace(e);
    }
    return 0;
  }
}

function assertHas(ctx, types) {
  if (typeof (ctx) !== 'object') {
    throw new Error('invalid context: ' + typeof (ctx));
  }
  //    ctx.assert(types);
  if (typeof (types) === 'object') {
    for (var i in types) {
      if (typeof (ctx[i]) !== types[i]) {
        throw new Error('assertion ' + i + ' requires ' + types[i] + ', given ' + typeof (ctx[i]));
      }
    }
  }
}

var sendQ = {
  items: 0,
  head: 0,
  push: function(ctx) {
    assertHas(ctx, {url: "string", msg: "string"});

    var tag = 'sendQ:'+ getTabID();
    var tail = GM_getValue(tag+':tail',0);
    /*
    GM_setValue(tag +':url:'+tail, JSON.stringify(ctx))
      GM_setValue(tag +':msg:'+tail, msg);
      */
    GM_setValue(tag +':ctx:'+tail, JSON.stringify(ctx))

//    console.log("set "+tag +':'+tail);

    GM_setValue(tag+':tail',++tail);
//    console.log("new tail "+ GM_getValue(tag+':tail',0));
  },
  shift: function() {
    var tag = 'sendQ:'+ getTabID();
    var head = GM_getValue(tag+':head',0);
    var tail = GM_getValue(tag+':tail',0);

    var ctx = JSON.parse(GM_getValue(tag +':ctx:'+head, ''));

//    console.log('head '+head+ ' url '+ctx.url);

    try {
      assertHas(ctx, {url: "string", msg: "string"});
    } catch(e) {
      console.log(e);
      return;
    }

    GM_deleteValue(tag +':ctx:'+head);
    GM_setValue(tag+':head',++head);

    if (head == tail) {
      GM_setValue(tag+':tail',0);
      GM_setValue(tag+':head',0);
    }
//    console.log('new head '+head + ', tail '+tail);
    return ctx;
  },
  clear: function() {
    var tag = 'sendQ:'+ getTabID();
    var head = GM_getValue(tag+':head',0);
    var tail = GM_getValue(tag+':tail',0);
    for (var i = head; i <= tail; i++) {
      GM_deleteValue(tag +':ctx:'+i);
    }
    GM_setValue(tag+':tail',0);
    GM_setValue(tag+':head',0);

    GM_deleteValue(tag+':waitFor');

  },
  length: function () {
    var tag = 'sendQ:'+ getTabID();
    var head = GM_getValue(tag+':head',0);
    var tail = GM_getValue(tag+':tail',0);
    return (tail - head);
  }
};
/*
sendQ.watch('items', function(id, oldval, newval) {
  console.log('sendQ.' + id + ' changed from ' + oldval + ' to ' + newval);
  console.log('items in watch '+sendQ.length);
  //    window.setTimeout(function(){ sendQueued(ctxDispatchResponse); }, 250);
  return newval;
});
*/

var alarm;
this.isSending = function()
{
  var tag = 'sendQ:'+ getTabID();
  var waitfor = GM_getValue(tag+':waitFor', null);
  if (waitfor != null) {
    console.log('waitfor: '+waitfor);
    return true;
  }
  return false;
}
function sendQueued(ctx)
{
  var tag = 'sendQ:'+ getTabID();
  if (sendQ.length() <= 0) {
    if (alarm != null) {
      window.clearTimeout(alarm);
      console.log('cleared timeout');
    }
    console.log('returning from sendQueued urls:'+sendQ.length());
    return;
  }
  //return if we havent passed wait time
  if ((new Date().getTime()) < parseInt(GM_getValue(tag+':waitFor', '0'))) {
    console.log('sendQ called prematurely urls:'+sendQ.length());
    return;
  }

//  if (!isSending()) {
    //  nice to have a cancel button
    //
      $( '#btnSendQCancel' ).show();
//  }

  //set a wait time in the future
  var min = 500, max = 3000;
  var waitMS = Math.floor(Math.random() * (max - min)) + min;
  console.log('setting wait '+waitMS+ ' for '+tag + ' len '+sendQ.length());
  GM_setValue(tag+':waitFor', (new Date().getTime()) + waitMS);

  //    console.log('urls:'+sendQ.length);
  //  console.log(' items pre shift '+sendQ.items);
  var sqCtx = sendQ.shift();
//  assertHas(sqCtx, {url: "string", msg: "string"});

  //  console.log('tuple '+tuple);
  //  console.log(' items post shift '+sendQ.items);

  consoleMsg(sqCtx.msg);

  console.log('send get for '+sqCtx.url + ' msg '+sqCtx.msg);

  GM_xmlhttpRequest({
    method: 'GET',
    url: sqCtx.url,
    timeout: 15000,
    ontimeout: function(response) {
      console.log("ontimeout :"+response);
      consoleMsg("ae server timeout", "errMsg");
      ctxQueueGet(sqCtx);
    },
    onerror: function(response) {
      console.log("onerror :"+response);
    },
    onload: function(resp) {

        sqCtx.html = resp.responseText;
        sqCtx = ctxResponseDoc(sqCtx);

        //  every queue item can have its own onload callback
        // 
        try {
          assertHas(sqCtx, {onload: "string"});

          aegis[sqCtx.onload](sqCtx);

        } catch(e) {
          //no onload function (or an error with it)
//          console.log(e);
        }

        if (sendQ.length() > 0) {
          var waitMS = 100;
          var nextTime = parseInt(GM_getValue(tag+':waitFor', '0'));
          var now = (new Date().getTime());
          if (nextTime > now) {
            waitMS = waitMS + (nextTime - now);
          }

          //call again after wait time
          alarm = window.setTimeout( function() { sendQueued(ctx); }, waitMS);

        } else {
          $('#btnSendQCancel').remove();

          GM_deleteValue(tag+':waitFor');

          if (!ctx.doneMsg) {
            consoleMsg("empty send queue", "noticeMsg");
          } else {
            consoleMsg(ctx.doneMsg, "infoMsg");
            if (ctx.doneMsg.match(/completed scan/)) {
              document.title = ">" + document.title;
            }
          }

          if (typeof ctx.chainID != "undefined") {
            ctxChainNext(ctx);
          }

        }
      }  
  });
}

RegExp.quote = function(str) {
  return str.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
};

this.ctxQueueGet = function(ctx)
{
  assertHas(ctx, {url: "string", msg: "string"});

  var re = new RegExp(RegExp.quote(serverURL));

  if (!ctx.url.match(re)) {
    ctx.url = serverURL + "/" + ctx.url;
  }

  //  unless specified, user wants ctxDispatch as onload callback
  //
  try {
    assertHas(ctx, {onload: "string"});
  } catch(e) {
    ctx.onload = "ctxDispatchResponse";
  }
  sendQ.push(ctx);

}

this.scanRegion = function(ctx)
{
  var region, systems;
  try {
    assertHas(ctx, {region: "string"});
    region = ctx.region.match(/[A-Za-z][0-9]{2}:[0-9]{2}/)[0];
  } catch(e) {
    consoleMsg("invalid region!<br>"+e.message,"errMsg");
    return;
  }

  systems = GM_getValue("starMap:"+region);

  if (!exists(systems)) {
    var gal = region.match(/[A-Za-z][0-9]{2}/)[0];
    getGalaxyXML({galaxy: gal, callback: (function(region) { 
      return function() { scanRegion({region: region}); }
    })(region)
    });
    return;
  }
  consoleMsg("scanning region "+region,"infoMsg");

  consoleMsg("chain: "+ctx.chainID)

  var system = systems.split(":");
  for (var i = 0; i < system.length; i++)
  {
    var loc = region + ":" + system[i];
    ctxQueueGet({url: "map.aspx?loc="+loc, msg: "scanning system "+loc});
  }

  if (typeof ctx.skipSend == "undefined") {
    ctx.doneMsg = "completed scan of "+region;
    sendQueued(ctx);
  }

  //  unsafeWindow.starsJS.watch(0, function () {
  //  var mapDelay = setTimeout( listViewableStars, 2000);
}

/********************************************************************************************************
*/

function ctxResponseDoc(ctx)
{
  var htmlParse = new DOMParser();

  ctx.doc = htmlParse.parseFromString(ctx.html, 'text/html');
//  delete ctx.html;

  return ctx;
}

this.ctxLoadDispatch = function(ctx)
{
  logTrace();

//  console.log(JSON.stringify(ctx));
//  document.documentElement = ctx.doc;
//  $( 'body' ).html(ctx.html);

  delete ctx.html;

//  makeConsole();

  ctxDispatchResponse(ctx);
}

this.ctxDispatchResponse = function(ctx)
{

  try {
    assertHas(ctx, {doc: "object"});
  } catch(e) { 
    try {
      assertHas(ctx, {html: "string"});
      ctx = ctxResponseDoc(ctx);
    } catch(e) { 
      throw new Error('ctxDispatchResponse passed no doc or html');
    }
  }

  //  don't override
  //
  if (typeof ctx.follow === "undefined") {
    ctx.follow = "all";
  }
  dispatch(ctx);

}

/*  stack trace that fits nicely in the console
 *
 */
Error.prototype.shortstack = function()
{
  var stack = this.stack,
    re = new RegExp("(.*?)@.*\/(.*?):(.*?):(.*)", "g"),
    line, ss = [];

  while (line = re.exec(stack)) {
    ss.push(line[1] + "@" + line[2] + ":" + line[3]);
  }
  return ss;
}

function dispatch(ctx) {
  try {
    assertHas(ctx, {url: "string", doc: "object"});
  } catch(e) { console.log(e); return; }

  ctx.url = decodeURIComponent(ctx.url);
  ctx.route = aegisURLstore;
  ctx.follow = "none";

  console.log('dispatching '+ctx.url );
  if (ctx.url.match(/(.+?)astroempires.com/)) {
    serverTime = ctx.doc.getElementById('server-time').getAttribute('title');

    console.log('dispatch server '+server+' playerID '+playerID + ' time '+serverTime);
    console.log("fleet_ch1 "+GM_getValue("moveFleet:fleet_ch1:"+playerID, null));
  } else {
    return;
  }

  ctx.data = { 
    "server": server,
    "time": serverTime,
    "playerID": playerID,
    add: function(tag, obj) {
      var id = null;
      //      console.log('aeData add');
      if (obj['id'] != null) {
        id = obj['id'];
        delete obj['id'];
      } else if (obj['location'] != null) {
        id = obj['location'];
      } else {
        console.log('invalid obj! tag: '+tag+" obj: "+JSON.stringify(obj));
        return;
      }
      if (this[tag] == null) {
        this[tag] = {};
      }
      this[tag][id] = obj;
    },
    hasData: function() {
      if (Object.keys(this).length > 5) {
        return 1;
      } else {
        //    console.log(JSON.stringify(aeData));
        return 0;
      }
    }
  };
  /*
     "fleet": {},
     "base": {},
     "astro": {},
     "player": {},
     */

  try {
    if (ctx.url.match(/astroempires\.com/)) {
      freeAccountRemoveAd(ctx.doc);
      replaceTime(ctx.doc);

      var daysOld = checkDaysOld(ctx);
      if (daysOld != null) {
        //sendQ.clear();
        consoleMsg("data is "+daysOld+" days old");
        ctx.follow = "none";
      }

      if (ctx.url.match(/map\.aspx\?loc=[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}:[0-9]{2}/)) {
        parseAstro(ctx);

      } else if (ctx.url.match(/map\.aspx\?loc=[A-Za-z][0-9]{2}:[0-9]{2}:[0-9]{2}$/)) {
        parseSystem(ctx);

      } else if (ctx.url.match(/map\.aspx\?(zoom=\d&)?loc=[A-Za-z][0-9]{2}:[0-9]{2}$/)) {
        //parseRegion();
      }

      if (daysOld == null) {
        if (ctx.url.match(/view=scanners/)) { 
          logTrace();
          parseScanner(ctx);

        } else if (ctx.url.match(/fleet\.aspx/)) {
          parseFleet(ctx);

        } else if (ctx.url.match(/base\.aspx\?base=\d+/)) {
          parseBase(ctx);

        } else if (ctx.url.match(/empire\.aspx(\?view=bases_events)?$/)) {

          parseEmpire(ctx);

        } else if (ctx.url.match(/guild\.aspx/)) {
          parseGuild(ctx);
        }
      }
      /*
  try {
    assertHas(ctx, {ondispatch: "string"});

    console.log('calling ondispatch: ', ctx.ondispatch);
    aegis[ctx.ondispatch](ctx);
  };
*/
      //  not every dispatch will result in a send to aegis server
      //  ensure ondispatch gets called anyway
      //
      if (ctx.data.hasData()) {
        ctxSendToServer(ctx);

      } else {
        if (typeof ctx.ondispatch === "string") {
        logTrace("ondispatch: "+ctx.ondispatch);
        var ondispatch = ctx.ondispatch;
        delete ctx.ondispatch;

          try {
            aegis[ondispatch](ctx);
          } catch(e) {
            console.log('error: ', e);
          }
        }
      }
    }
  } catch(e) {
    console.log(e);
    consoleMsg(e.shortstack().join("\n&nbsp;&nbsp;"), "infoMsg"); 
    consoleMsg(e.message, "errMsg");
    /*
    var errorMsg = {
      "server": server,
      "time": serverTime,
      "playerID": playerID,
      "msg": e.message,
      "stack": e.stack,
      "ctx.url": ctx.url
    };
    sendToServer(errorMsg);
    */
  }
}

/*  have to actually load the resources specified in header
 */
function doResources()
{
  var css = ['aegis.css', 'jquery-ui.css'];
  css.forEach(function(el, i, a) {
    var res = GM_getResourceText(el);
    GM_addStyle(res);
  });
}

function CurrentServerTime()
{
  var mNow = moment(new Date());
  var localDiff = moment.duration(mNow.diff(mLocalStartTime));
  var mCurrentServerTime = moment(mServerTime).add(localDiff);
  return mCurrentServerTime;
}


this.doit = function() {
  consoleClear();
  consoleMsg('doin it')
//  var key = keys[0];
//  for (var i=0; key != null; key=keys[i++] ) {
  var keys = GM_listValues();
  keys.forEach(function(el, i ,a) {
    if (el.match(/^ctxChain:/)) {
      GM_deleteValue(el);
    }
  });
  console.log('cleared chains', GM_getValue("ctxChain:next"));

  var m = $('#curGalReg').html().match(/[A-Za-z][0-9]{2}/);

  consoleMsg('scouting galaxy '+m[0]);

  if (m.length) {
    ctxSendToServer({data:{func:"scoutGalaxy", ctx: {galaxy: m[0], scouts: 10, start: $("#moveScoutFrom").val()}}, 
      route:aegisURLquery, ondispatch:"ctxQueryResponse"}); 
  } else {
    consoleMsg('no galaxy selected', 'errMsg');
  }
}


/*  ctx.command = {func: "string", ctx: "object"}
 *  
 */
this.ctxRunCmd = function(ctx)
{
  console.log('ctxRunCmd ', ctx);
  assertHas(ctx, {func: "string", ctx: "object"});
  var cmd = ctx.func;
  var cmdCtx = ctx.ctx;
  cmdCtx.chainID = ctx.chainID;

/*
  if (tryAssertHas(cmdCtx, {msg: "string"}), 1) {
    consoleMsg('get '+cmdCtx.msg);
  } else {
  */
    consoleMsg("processing command:<br>&nbsp;&nbsp;"+cmd + "("+ cmdCtx + ")");
    for (i in cmdCtx) {
      consoleMsg(i + ": " +cmdCtx[i]);
    }
//  }

  try {
    ctxCmd = aegis[cmd](cmdCtx);
  } catch(e) {
    consoleMsg(e.message + "<br>"+cmd+"<br>"+e.shortstack().join("\n&nbsp;&nbsp;"), "errMsg");
    ctxCmd.error = e.message;
  }
  return ctxCmd;

}

//  handle a response from a server query
//
this.ctxQueryResponse = function(ctx)
{
  logTrace();
  if (tryAssertHas(ctx, {response: "object"}, 1)) {
    logTrace("response");
    console.log(ctx);

    for (i in ctx.response) {
      consoleMsg(i + " => " +ctx.response[i]);
    }

  }
  if (tryAssertHas(ctx, {command: "object"}, 1)) {
    logTrace("command");
    console.log(ctx);

    console.log("server sent command: ", ctx.command);
    var cmdCtx = ctx.command;

    // come back here when the command finishes
    //   should the command result in a dispatch
    //
    cmdCtx.ctx.ondispatch = "ctxQueryResponse";

    ctxRunCmd(cmdCtx);

    if (cmdCtx.func == "ctxQueueGet" && (! isSending())
          && typeof ctx.inBatch == "undefined") {

      consoleMsg('svr command send queued');
      ctx.doneMsg = "svr command done";
//      sendQueued(ctx);
    }

  }

  if (tryAssertHas(ctx, {batch: "object"}, 1)) {
    logTrace("batch");
    console.log(ctx);
    ctx.batch.forEach(function(el, i , a) {
      logTrace(el);
      el.inBatch = 1;
      ctxQueryResponse(el);

    });
    ctx.doneMsg = "batch done";
    consoleMsg('send queued');
    sendQueued(ctx);
  }

  if (tryAssertHas(ctx, {chain: "object"}, 1)) {
    logTrace("queryResponse: chain");
    console.log(ctx);

//  ctx = ctxChainCmd(ctx,{func: 'scanRegion', ctx: {region: ctx.destination}});

    ctx.chain.forEach(function(chain, ci , a) {
      var ctxChain = {};
      chain.forEach(function(cmd, i , a) {
        ctxChain = ctxChainCmd(ctxChain, cmd);
      });
      window.setTimeout( (function(ctx) {
        console.log(ctx);
        return function() {
  console.log('doing chain: ' +GM_getValue("ctxChain:" + ctx.chainID));
          ctxChainNext(ctx);
        };
      })(ctxChain), ci * 10000);
    });
  }
  logTrace();
  return ctx;
}

this.randomAstro = function(ctx)
{
  console.log('randomAstro ',ctx);
  ctxSendToServer({data:ctx, route:aegisURLquery, ondispatch:"ctxQueryResponse"}); 
}

$(document).ready(function() {

  checkForUpdate();
  checkSendBufferCache();
  makeConsole();
  /*
  $(document.createElement("div"))
    .attr({id: "test"})
    .attr("class", "reset-this aegisToolbox ui-widget-content")
    .html("<b id='aegis-tag'>weeeee</b>")
    .draggable()
    .appendTo('body');
  */
  dispatch({url: document.URL, doc: document, follow: "all"});

  log('load');
  
//  randomAstro({randomAstro: "B39:55"});

});

/**************************************************************************************/

if (document.location.href.match(/(.+?)astroempires.com/)) {

  server = document.URL.match(/\/(.+?).astroempires.com/)[1];
  server = server.replace(/\//, '');
  serverURL = 'http://' + server + '.astroempires.com';
  playerID = document.getElementById('account').parentNode.getElementsByTagName("th")[1].innerHTML;
  serverTime = document.getElementById('server-time').getAttribute('title');

  mServerTime = moment( document.getElementById('server-time').getAttribute('title'), 
    "YYYY/MM/DD HH:mm:ss");
  dStartTime = new Date();
  localTimeZoneOffset = dStartTime.getTimezoneOffset();
  mLocalStartTime = moment(dStartTime);
  console.log("Server Time: "+mServerTime.format('YYYY/MM/DD HH:mm:ss'));
  console.log("Local Time: "+mLocalStartTime.format('YYYY/MM/DD HH:mm:ss')
      + " tz offset:" + localTimeZoneOffset);
}

//sendQ.push({blah: 1});

doResources();
setTabName();

console.log("aegis loaded successfully");
