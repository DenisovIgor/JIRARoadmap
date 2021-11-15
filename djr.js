(function () {

    const PROJECT = "DBK";

    const MS_PER_DAY = 24*60*60*1000;
    const START_DATE = numDays("2021-10-31");
    const DAY_WIDTH = 30;
    const NUM_DAYS = 365;
    const ROADMAP_WIDTH = NUM_DAYS*DAY_WIDTH;

    const RCN = "djr_" + Math.floor(Math.random()*10000000000) + "_";

    var _dialog, _shader;
    var jira_data = undefined;

    function init() {
        var d3_script = document.createElement('SCRIPT');
        d3_script.type = 'text/javascript';
        d3_script.src = 'https://d3js.org/d3.v6.min.js';
        document.getElementsByTagName('head')[0].appendChild(d3_script);
        
        _shader = document.createElement('div');
        _shader.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; z-index: 1000000000; background: #222; opacity: 0.75";
    
        _dialog = document.createElement('div');
        _dialog.style.cssText = "position:fixed; top:30px; left:50%; margin:0; border-radius:3px; height:800px; width:1200px; z-index: 1000000001; overflow: hidden; font-family:sans-serif; background:#fff; transform:translateX(-50%);";
        _dialog.innerHTML = 
                `<style>
                    .${RCN}grid {border: 1px solid #000; width:100%; height:100%; overflow: auto; box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; font-size: 14px;}
                    .${RCN}grid * {box-sizing:border-box;}
                    .${RCN}t_head {border-bottom: 1px solid #000; overflow-x: hidden; height: 40px;}
                    .${RCN}name_col {border-right: 1px solid #000; flex: 0 0 500px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding: 5px; background: #fff;}
                    .${RCN}time_col,
                    .${RCN}sizer {width: ${ROADMAP_WIDTH}px; background: #fff; position: relative; z-index:-1;}
                    .${RCN}t_head>.${RCN}time_col {padding:0;}
                    .${RCN}t_row:nth-child(even) .${RCN}time_col,
                    .${RCN}t_row:nth-child(even) .${RCN}name_col {background: #f5f5f5;}
                    .${RCN}t_row:last-child .${RCN}time_col,
                    .${RCN}t_head .${RCN}time_col {border-bottom:none;}
                    .${RCN}t_body {height: calc(100% - 60px); overflow-y: scroll; overflow-x: hidden;}
                    .${RCN}t_head,
                    .${RCN}t_row,
                    .${RCN}time_col {display: flex; flex-direction:row}
                    .${RCN}level2 .${RCN}name_col {padding-left: 25px;}
                    .${RCN}level3 .${RCN}name_col {padding-left: 45px;}
                    .${RCN}bar {position: absolute; top: 5px; bottom: 5px; border-radius: 5px;}
                    .${RCN}level1 .${RCN}bar {background: #90f;}
                    .${RCN}level2 .${RCN}bar {background: #0f9;}
                    .${RCN}level3 .${RCN}bar {background: #09f;}
                    .${RCN}t_foot {margin-left: 500px; overflow-x: auto; height: 20px;}
                    .${RCN}tick {font-size: 10px; padding: 5px; text-align: center; overflow: hidden;}
                    .${RCN}tick.${RCN}day {flex: 0 0 ${DAY_WIDTH}px;}
                    .${RCN}tick.${RCN}day:nth-child(7n),
                    .${RCN}tick.${RCN}day:nth-child(7n-1) {background: #eee;}
                    .${RCN}tick.${RCN}day:nth-child(7n),
                    .${RCN}grid_line {border-right: 1px dashed #999;}
                    .${RCN}grid_line {flex: 0 0 ${DAY_WIDTH*2}px; height: 100%; background: #eee; opacity: 0.5;}
                    .${RCN}t_body .${RCN}time_col {gap: ${DAY_WIDTH*5}px; padding-left: ${DAY_WIDTH*5}px;}
                    .${RCN}sizer {height: 10px;}
                    .${RCN}close_button {position:absolute; top:10px; left:10px; color:#f00; width: 19px; height: 19px; cursor: pointer; font-weight: bold; text-align: center; text-shadow: 0px 0px 5px #000;}
                </style>
                <div class="${RCN}close_button">X</div>
                <div class="${RCN}grid">
                    <div class="${RCN}t_head">
                        <div class="${RCN}name_col"></div>
                        <div class="${RCN}time_col"></div>
                    </div>
                    <div class="${RCN}t_body">
                    </div>
                    <div class="${RCN}t_foot">
                        <div class="${RCN}sizer"></div>
                    </div>
                </div>`;

        let closeButton;

        [,closeButton, _table] = [..._dialog.children];
                    
        closeButton.onclick = closeDialog;

        document.body.appendChild(_shader);
        document.body.appendChild(_dialog);

        showDJBDialog();
    }

    showDJBDialog = function() {
        _dialog.style.display = 'block';
        _shader.style.display = 'block';
        initData();
    }

    function closeDialog() {
        _dialog.style.display = 'none';
        _shader.style.display = 'none';
    }

    function initData(startAt=0) {

        var project = d3.select("#ak-side-navigation h2").text() || PROJECT;

        jQuery.ajax({
            url: `${location.origin}/rest/api/latest/search?startAt=${startAt}&jql=project=${project}`
        })
        .done( data => {

                if (jira_data == undefined) {
                    jira_data = data;
                }
                else {
                    jira_data.issues.push(...data.issues);
                }

                if ( startAt + data.maxResults < data.total ) {
                    initData(startAt + data.maxResults);
                } else {
                    initRoadmap();
                }
            }
        );
    }

    function numDays( date_str ) {
        return Math.floor((new Date(date_str))/MS_PER_DAY);
    }

    function scrollH(event,d) {
        d3.selectAll(`.${RCN}time_col`).style("margin-left",(-this.scrollLeft) + "px");
    }

    function initRoadmap() {
        var data = jira_data.issues
                    .filter( d => d.fields.issuetype.hierarchyLevel == 1 )
                    .map( d => [ d, 
                        jira_data.issues
                            .filter( d1 => d1.fields.customfield_10014 == d.key )
                            .map( d1 => [ d1, jira_data.issues.filter( d => d.fields.parent?.key == d1.key ) ] )
                    ] ).flat(10);

//            const month_scale_format = d3.timeFormat("%b");
        const day_scale_format = d3.timeFormat("%a %d");
        
//            var month_scale = d3.scaleTime().domain([START_DATE*MS_PER_DAY, (START_DATE + NUM_DAYS)*MS_PER_DAY]).range([0, NUM_DAYS]).ticks(NUM_DAYS + 1).map(scale_format);
        var day_scale = d3.scaleTime()
                            .domain([START_DATE*MS_PER_DAY, (START_DATE + NUM_DAYS)*MS_PER_DAY])
                            .range([0, NUM_DAYS])
                            .ticks(NUM_DAYS + 1)
                            .map(day_scale_format);

        d3.select(`.${RCN}t_head>.${RCN}time_col`)
            .selectAll(`.${RCN}tick`)
                .data( day_scale )
                    .enter()
                        .append("div")
                            .classed(`${RCN}tick`,true)
                            .classed(`${RCN}day`,true)
                            .text( d => d );

        var container = d3.select(`.${RCN}t_body`);
        var rows = container.selectAll(`.${RCN}t_row`).data( data, d => d.key );

        var new_rows = rows.enter()
                            .append("div")
                                .attr( "class", d => `${RCN}t_row ${RCN}level${2-d.fields.issuetype.hierarchyLevel}`);
        new_rows
            .append("div")
                .classed(`${RCN}name_col`,true)
                .text( d => d.key + " " + d.fields.summary );

        var time_col = new_rows
                        .append("div")
                            .classed(`${RCN}time_col`,true);

        time_col.selectAll(`.${RCN}grid_line`)
                    .data( day_scale.filter( (d,i) => i%7 == 0 ) )
                        .enter()
                            .append("div")
                                .classed(`${RCN}grid_line`,true);

        time_col.filter( d => d.fields.customfield_10015 && d.fields.duedate )
                    .append("div")
                        .classed(`${RCN}bar`,true)
                        .style("left", d => (numDays(d.fields.customfield_10015) - START_DATE) * DAY_WIDTH + "px")
                        .style("width", d => (numDays(d.fields.duedate) - numDays(d.fields.customfield_10015) + 1) * DAY_WIDTH + "px");

        d3.select(`.${RCN}t_foot`).on("scroll",scrollH);
    }

    init();
})();
