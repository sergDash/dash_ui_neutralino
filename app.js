// Start app - run neutralino-win_x64.exe
// Press F12 for call developer tools
Neutralino.init();


// Init Global variables
let l10n = {}
let app = { rpcuser: "", rpcpassword: "" };


Neutralino.events.on( "ready", async function() {

    Neutralino.window.move( 10, 10 );

    
    // Load file for detect user language
    l10n["_map"] = await await_read_json_file( `${NL_PATH}/lang/_map.json` );

    // Detect User language
    // or set en_US if translations not exists
    if ( l10n["_map"][navigator.language] ) {
        l10n["lang"] = l10n["_map"][navigator.language];
    } else {
        l10n["lang"] = "en_US";
    }

    // Load translations from language file
    let lang = await await_read_json_file( `${NL_PATH}/lang/${l10n["lang"]}.json` );
    Object.assign( l10n, lang ); // merge lang to l10n


    // Read rpcuser & rpcpassword from neutralino.config.json
    if ( NL_RPCUSER !== "" && NL_RPCPASSWORD !== "" ) {
        app.rpcuser = NL_RPCUSER;
        app.rpcpassword = NL_RPCPASSWORD;
    } else {
        // Read rpcuser & rpcpassword from dash.conf
        let dash_conf = "";
        if ( NL_OS == "Windows" ) {
            app.user_dir = await Neutralino.os.getEnv( "USERPROFILE" );
            dash_conf = `${app.user_dir}/AppData/Roaming/DashCore/dash.conf`;
        } else if ( NL_OS == "Linux" ) {
            app.user_dir = await Neutralino.os.getEnv( "HOME" );
            dash_conf = `${app.user_dir}/.dashcore/dash.conf`;
        } else if ( NL_OS == "Darwin" ) {
            app.user_dir = await Neutralino.os.getEnv( "HOME" );
            dash_conf = `${app.user_dir}/.dashcore/dash.conf`;
        }
        let content = await await_read_file( dash_conf );
        let lines = content.split( "\n" );
        
        for ( line of lines ) {
            let attr = line.split( "=" );
            let key = attr[0].trim();
            if ( key == "rpcuser" ) {
                app.rpcuser = attr[1].trim();
            }
            if ( key == "rpcpassword" ) {
                app.rpcpassword = attr[1].trim();
            }
        }
    }

    
    // Translate UI
    // Commandline placeholder
    document.querySelector( ".console textarea" ).setAttribute( "placeholder", __( "console_placeholder", "UI" ) );
    // Status dashd
    document.querySelector( ".status_bar .status_dashd" ).setAttribute( "title", __( "status_dashd", "UI" ) );
    // Status Neutralino
    document.querySelector( ".status_bar .status_neutralino" ).setAttribute( "title", __( "status_neutralino", "UI" ) );
    // Show Console
    document.querySelector( ".status_bar .show_console" ).setAttribute( "title", __( "show_console", "UI" ) );


    // Test dashd path
    if ( NL_OS == "Windows" ) {
        app.dashd_path = NL_WIN_DASHD;
        app.dashd_params = NL_WIN_DASHD_PARAMS;
    } else if ( NL_OS == "Linux" ) {
        app.dashd_path = NL_LIN_DASHD;
        app.dashd_params = NL_LIN_DASHD_PARAMS;
    } else if ( NL_OS == "Darwin" ) {
        app.dashd_path = NL_MAC_DASHD;
        app.dashd_params = NL_MAC_DASHD_PARAMS;
    }
    if ( ! await await_file_exists( app.dashd_path ) ) {
        console.error( __( "dashd_path_error", "log" ) );
    }


    // Console commands
    // fix CR in textarea
    document.querySelector( ".console textarea" ).addEventListener( "keyup", function( e ) {
        if ( e.keyCode == 13 && ! e.shiftKey ) {
            document.querySelector( ".console textarea" ).value = "";
        }
    } );
    document.querySelector( ".console textarea" ).addEventListener( "keydown", async function( e ) {
        if ( e.keyCode == 13 && ! e.shiftKey ) {

            let cmd_str = document.querySelector( ".console textarea" ).value.trim().replace( "\n", " " );
            let cmd_arr = cmd_str.split( " ", 1 );
            document.querySelector( ".console textarea" ).value = "";

            console_log( cmd_str );

            switch( cmd_arr[0] ) {

                case "stop":
                    stop_dashd();
                break;

                case "start":
                    start_dashd();
                break;

                case "dumphdinfo":
                    rpc( { "method": "dumphdinfo", "params": [] }, function( r ) {
                        console_log( `hdseed: "${r.result.hdseed}"` );
                        console_log( `mnemonic: "${r.result.mnemonic}"` );
                        console_log( `mnemonicpassphrase: "${r.result.mnemonicpassphrase}"` );
                    } );
                break;

            }
        }
    } );


    // Start/stop Dashd from status bar
    document.querySelector( ".status_bar .status_dashd" ).addEventListener( "click", function() {
        if ( this.classList.contains( "started" ) ) {
            stop_dashd();
        } else if ( this.classList.contains( "not_started" ) ) {
            this.classList.add( "start" );
            start_dashd();
        }
    } );
    
    // Show/Hide Console from status bar
    document.querySelector( ".status_bar .show_console" ).addEventListener( "click", function() {
        document.querySelector( ".console" ).classList.toggle( "hidden" );
    } );
    

    // Cron
    setInterval( async function() {
    
        // Check Dashd status
        rpc( { "method": "uptime", "params": [] }, function( r ) {
            if ( typeof r == "object" ) {
                if ( r.error == null ) {
                    set_dashd_status( "started" );
                } else {
                    set_dashd_status( "starting" );
                }
            } else if ( typeof r == "undefined" ) {
                set_dashd_status( "not_started" );
            }
        } );
    
        // Check Neutralino status
        // (detect crashes)
        if ( app.neutralino_status ) {
            let timeout = new Date().getTime() - app.neutralino_status;
            if ( timeout > 1000 ) {
                let status_el = document.querySelector( ".status_neutralino" );
                if ( status_el ) {
                    status_el.classList.remove( "started" );
                    status_el.classList.add( "not_started" );
                }
            }
        } else {
            app.neutralino_status = new Date().getTime();
            await Neutralino.app.broadcast('myTestEvent', 'Hello');
            delete app.neutralino_status;
            let status_el = document.querySelector( ".status_neutralino" );
            if ( status_el ) {
                status_el.classList.remove( "not_started" );
                status_el.classList.add( "started" );
            }
        }
    
    }, 1000 );


    // Run Tray Icon
    /*
    if ( NL_OS != "Darwin" ) { // TODO: Fix https://github.com/neutralinojs/neutralinojs/issues/615
        if ( NL_MODE != "window" ) {
            console.log( "INFO: Tray menu is only available in the window mode." );
        } else {
            let tray = {
                icon: "/favicon-32x32.png",
                menuItems: [
                    { id: "VERSION", text: __( "Get version", "tray" ) },
                    { id: "SEP", text: "-" },
                    { id: "QUIT", text: __( "Quit", "tray" ) }
                ]
            };
            Neutralino.os.setTray( tray );

            // Bind Tray events
            Neutralino.events.on( "trayMenuItemClicked", onTrayMenuItemClicked );
            function onTrayMenuItemClicked( event ) {
                switch( event.detail.id ) {
                    case "VERSION":
                        Neutralino.os.showMessageBox( __( "Version information", "UI" ),
                            `Neutralinojs server: v${NL_VERSION} | Neutralinojs client: v${NL_CVERSION}` );
                        break;
                    case "QUIT":
                        Neutralino.app.exit();
                        break;
                }
            }
        }
    }
    */

});


Neutralino.events.on( "windowClose", function() {
    Neutralino.app.exit();
} );





/* Functions */


// Translate string
function __( str, context ) {
    let lang = l10n["lang"];
    if ( l10n && l10n[lang] && l10n[lang][context] && l10n[lang][context][str] ) {
        return l10n[lang][context][str];
    } else {
        console.warn( `No translation for "${str}" to "${lang}" lang in "${context}" context.` );
        return str;
    }
}


// UI console log
function console_log( line, classes = "" ) {
    let log = document.querySelector( ".console .log" );
    let scrolled_to_bottom = Math.abs( log.scrollHeight - log.clientHeight - log.scrollTop ) < 1;
    
    log.insertAdjacentHTML( "beforeend", `<div class="line ${classes}">${line}</div>` );
    
    if ( scrolled_to_bottom ) {
        let scroll = Math.abs( log.scrollHeight - log.clientHeight - log.scrollTop );
        log.scrollTop += scroll;
    }
}


// Example:
// rpc( { method: "uptime", params: [] }, function( r ) { alert( r ); } );
// More functions https://dashcore.readme.io/docs/core-api-ref-remote-procedure-calls-control
async function rpc( data, callback ) {
    if ( app.rpcuser == "" || app.rpcpassword == "" ) {
        console.error( __( "not_set_user_and_password", "error" ) );
        return;
    }

    let id = new Date().getTime().toString();
    data["jsonrpc"] = "1.0";
    data["id"] = id;

    let xhr = new XMLHttpRequest();
    xhr.timeout = 500;
    xhr.open( "post", NL_DASHD_URL );
    xhr.setRequestHeader( "Content-Type", "text/plain" );
    xhr.setRequestHeader( "Authorization", "Basic " + btoa( `${app.rpcuser}:${app.rpcpassword}` ) );

    xhr.onload = function() {
        if ( callback ) {
            let json = "";
            if ( xhr.responseText.substring( 0, 1 ) == "{" ) {
                json = JSON.parse( xhr.responseText );
            }
            callback( json );
        }
    };

    xhr.onerror = function() {
        if ( callback ) {
            callback();
        }
    };
    // not started
    xhr.onreadystatechange = function() {
        if ( xhr.readyState === XMLHttpRequest.DONE ) {
            if ( xhr.status === 0 ) {
                if ( callback ) {
                    callback();
                }
            }
        }
    }
    xhr.send( JSON.stringify( data ) );
}


function set_dashd_status( status ) {
    app.dashd_status = status;
    let el = document.querySelector( ".status_dashd" );
    // reset previous classes
    el.setAttribute( "class", "status_dashd" );
    // add status class
    el.classList.add( status );

    switch( status ) {
        case "started":
            if ( app.dashd_start_time ) {
                delete app.dashd_start_time;
                document.querySelector( ".status_bar .msg" ).innerHTML = __( "dashd_started", "msg" );
            }
            // dumphdinfo
            if ( app.usehd ) {
                rpc( { "method": "dumphdinfo", "params": [] }, function( r ) {
                    document.querySelector( ".status_bar .msg" ).innerHTML = __( "important_info", "msg" );
                    // open console
                    document.querySelector( ".console" ).classList.remove( "hidden" );
                    console_log( __( "important_info", "log" ) );
                    console_log( `hdseed: "${r.result.hdseed}"` );
                    console_log( `mnemonic: "${r.result.mnemonic}"` );
                    console_log( `mnemonicpassphrase: "${r.result.mnemonicpassphrase}"` );
                } );
                app.usehd = "";
            }
        break;

        case "not_started":
            document.querySelector( ".status_bar .msg" ).innerHTML = __( "click_to_start", "msg" );
            // check result of start dashd
            if ( app.dashd_start_time ) {
                let timeout = new Date().getTime() - app.dashd_start_time;
                if ( timeout > 1000 ) {
                    // open console
                    document.querySelector( ".console" ).classList.remove( "hidden" );
                    console_log( __( "dashd_start_error", "log" ) );
                    delete app.dashd_start_time;
                }
            }
        break;
    }

    // if starting
    if ( app.dashd_start_time ) {
        el.classList.add( "start" );
        document.querySelector( ".status_bar .msg" ).innerHTML = __( "dashd_starting", "msg" );
    }
}


function stop_dashd() {
    rpc( { method: "stop", params: [] }, function( r ) {
        if ( r ) {
            console.log( r );
        } else {
            console.log( __( "dashd_stopped", "log" ) );
        }
    } );
}


async function start_dashd() {
    // Test wallet.dat
    app.usehd = "";
    let wallet_dat = "";
    if ( NL_OS == "Windows" ) {
        wallet_dat = `${app.user_dir}/AppData/Roaming/DashCore/wallets/wallet.dat`;
    } else if ( NL_OS == "Linux" ) {
        wallet_dat = `${app.user_dir}/.dashcore/wallets/wallet.dat`;
    } else if ( NL_OS == "Darwin" ) {
        wallet_dat = `${app.user_dir}/.dashcore/wallets/wallet.dat`;
    }
    if ( ! await await_file_exists( wallet_dat ) ) {
        app.usehd = "--usehd";
    }
    app.dashd_start_time = new Date().getTime();
    Neutralino.os.execCommand( `"${app.dashd_path}" ${app.usehd} ${app.dashd_params}`, { background: true } );
}



/* Promise wrappers */


// let content = await await_read_file( "dash.conf" );
async function await_read_file( path ) {
    let x = await Neutralino.filesystem.readFile( path ).then(
        function( content ) {
            return content;
        },
        function( content ) {
            console.error( "Error loading " + path );
            return "";
        }
    );
    return x;
}


// let obj_from_file = await await_read_json_file( "file.json" );
async function await_read_json_file( path ) {
    let x = await Neutralino.filesystem.readFile( path ).then(
        function( content ) {
            return JSON.parse( content );
        },
        function( content ) {
            console.error( "Error loading " + path );
            return {};
        }
    );
    return x;
}


// let dashd_exists = await await_file_exists( NL_DASHD_EXE );
async function await_file_exists( path ) {
    let x = await Neutralino.filesystem.getStats( path ).then(
        function ( stat ) {
            return true;
        },
        function ( stat ) {
            return false;
        }
    );
    return x;
}