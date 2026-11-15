// UI-level repeat controller. The engine stays unaware of repeat mode.
// Remember the actively audible stems before its onended callback clears them.
export function createRepeatController(){
  let enabled=false,wasPlaying=false,lastMode=null;
  return {
    toggle(){enabled=!enabled;return enabled;},
    cancel(){wasPlaying=false;lastMode=null;},
    observe({playing,vocals,instrumental,currentTime,duration}){
      if(playing){
        const mode=vocals&&instrumental?'both':vocals?'vocals':instrumental?'instrumental':null;
        if(mode){wasPlaying=true;lastMode=mode;}
        return null;
      }
      const mode=enabled&&wasPlaying&&duration>0&&currentTime>=duration?lastMode:null;
      wasPlaying=false;
      return mode;
    },
  };
}
