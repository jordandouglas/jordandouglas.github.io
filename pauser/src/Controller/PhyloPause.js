
/* 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
    This file is part of SimPol.

    SimPol is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    SimPol is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with SimPol.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/





function beginPauser(resume_simulation = false){

    console.log("Beginning PhyloPause")


    // Change the description of the begin PhyloPause button
    $("#beginPauser").val("Stop PhyloPause");
    $("#beginPauser").attr("onclick", "stop_controller()");




    // Initialise the simulation
    startPauser_controller(resume_simulation, function() {

        // Change the description of the begin PhyloPause button
        $("#beginPauser").val("Resume PhyloPause");
        $("#beginPauser").attr("onclick", "beginPauser(true)");

    });




}





