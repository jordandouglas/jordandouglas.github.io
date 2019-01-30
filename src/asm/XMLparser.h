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



#ifndef XMLPARSER_H
#define XMLPARSER_H

#include "Plots.h"
#include "tinyxml/tinyxml.h"

#include <string>
using namespace std;

class XMLparser{

	static void parseXMLFromDocument(TiXmlDocument doc, Plots* plotsObj);

	public:
		static bool parseXMLFromFilename(char* fileName, Plots* plotsObj);
		static bool parseXMLFromString(char* XMLdata, Plots* plotsObj);

};




#endif
