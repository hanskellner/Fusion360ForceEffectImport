//Author-Hans Kellner
//Description-Import a ForceEffect or ForceEffect Motion (*.afe) document and create components in Fusion 360.
//Using the following:
// jQuery - <a href="http://jquery.com/">jquery.com</a>
// xml2json - &copy; <a href="http://www.fyneworks.com/">Fyneworks.com</a>

/*!
Copyright (C) 2015 Hans Kellner: https://github.com/hanskellner/Fusion360ForceEffectImport
MIT License: See https://github.com/hanskellner/Fusion360ForceEffectImport/LICENSE.md
*/

/*
This is a script for Autodesk Fusion 360 that imports ForceEffect and ForceEffect Motion (*.afe) files and creates components from the contents.

Installation:

Copy the "Fusion360ForceEffectImport" folder into your Fusion 360 "My Scripts" folder. You may find this folder using the following steps:

1. Start Fusion 360 and then select the File -> "Scripts and Add-Ins..." menu item
2. The Scripts and Add-Ins dialog will appear and display the "My Scripts" and "Sample Scripts" folders
3. Select one of the "My Scripts" files and then click on the "+" Details icon near the bottom of the dialog.
  - If there are no files in the "My Scripts" folder then create a default one by clicking the Create button, select JavaScript, and then OK.
4. With a user script selected and the "Details" section expanded, look at the Full Path value.  This contains the location of the user scripts folder.
5. Copy this script's folder into that location.
  For example, on my Mac the folder is located in:
    /Users/USERNAME/Library/Application Support/Autodesk/Autodesk Fusion 360/API/Scripts
  And on Windows:
    C:\users\USERNAME\AppData\Roaming\Autodesk\Autodesk Fusion 360\API\Scripts
6. Now add the script to the lists of "My Scripts"
7. Click the "+" icon next to the "my Scripts" item
  - The "Add new script" dialog should appear.
8. Locate the ForceEffectImport.js file in the folder you copied, select it, and click Open. The script should now be installed and ready to be run.

The script should be ready to run.

*/

/*globals adsk*/
(function () {

    "use strict";

    // This holds a representation of the AFE model populated by parseAFEJson()
    var afeModel = {};

    var app = adsk.core.Application.get(), ui;
    if (app) {
        ui = app.userInterface;
    }

    var filename = "";  // Name of the file to import

    // Create the command definition.
    var createCommandDefinition = function() {
        var commandDefinitions = ui.commandDefinitions;
        var commandDefinitions = ui.commandDefinitions;

        // Be fault tolerant in case the command is already added...
        var cmDef = commandDefinitions.itemById('ForceEffectImport');
        if (!cmDef) {
            cmDef = commandDefinitions.addButtonDefinition('ForceEffectImport',
                    'ForceEffect Import',
                    'Import a ForceEffect or ForceEffect Motion document.',
                    './resources'); // relative resource file path is specified
        }
        return cmDef;
    };

    // CommandCreated event handler.
    var onCommandCreated = function(args) {
        try {
            // Connect to the CommandExecuted event.
            var command = args.command;
            command.execute.add(onCommandExecuted);

            // Terminate the script when the command is destroyed
            command.destroy.add(function () { adsk.terminate(); });

            // Define the inputs.
            var inputs = command.commandInputs;

            var initValScale = adsk.core.ValueInput.createByReal(afeModel.Scale);
            inputs.addValueInput('scale', 'Scale', 'cm' , initValScale);  // REVIEW: What about unitless values?

            var initValCompWidth = adsk.core.ValueInput.createByReal(afeModel.ComponentWidth);
            inputs.addValueInput('componentWidth', 'Component Width', 'cm' , initValCompWidth);

            inputs.addBoolValueInput('extrude', 'Extrude', true, ".", true);

            var initValExtrudeDist = adsk.core.ValueInput.createByReal(afeModel.ExtrudeDist);
            inputs.addValueInput('extrudeHeight', 'Extrude Distance', 'cm' , initValExtrudeDist);

            var initValJointHoleDiam = adsk.core.ValueInput.createByReal(afeModel.JointHoleDiameter);
            inputs.addValueInput('jointHoleDiameter', 'Joint Hole Diameter', 'cm' , initValJointHoleDiam);
        }
        catch (e) {
            ui.messageBox('Failed to create command : ' + (e.description ? e.description : e));
        }
    };

    // CommandExecuted event handler.
    var onCommandExecuted = function(args) {
        try {

            // Extract input values
            var unitsMgr = app.activeProduct.unitsManager;
            var command = adsk.core.Command(args.firingEvent.sender);
            var inputs = command.commandInputs;

            var scaleInput, componentWidthInput, extrudeInput, extrudeHeightInput, jointHoleDiameterInput;

            // Problem with a problem - the inputs are empty at this point. We
            // need access to the inputs within a command during the execute.
            for (var n = 0; n < inputs.count; n++) {
                var input = inputs.item(n);
                if (input.id === 'scale') {
                    scaleInput = adsk.core.ValueCommandInput(input);
                }
                else if (input.id === 'componentWidth') {
                    componentWidthInput = adsk.core.ValueCommandInput(input);
                }
                else if (input.id === 'extrude') {
                    extrudeInput = adsk.core.BoolValueCommandInput(input);
                }
                else if (input.id === 'extrudeHeight') {
                    extrudeHeightInput = adsk.core.ValueCommandInput(input);
                }
                else if (input.id === 'jointHoleDiameter') {
                    jointHoleDiameterInput = adsk.core.ValueCommandInput(input);
                }
            }

            if (!scaleInput || !componentWidthInput || !extrudeInput || !extrudeHeightInput || !jointHoleDiameterInput) {
                ui.messageBox("One of the inputs don't exist.");
                return;
            }

            var scale = unitsMgr.evaluateExpression(scaleInput.expression, "cm");
            if (scale <= 0.0) {
                ui.messageBox("Invalid scale: must be > 0");
                return;
            }

            afeModel.Scale = scale;

            var componentWidth = unitsMgr.evaluateExpression(componentWidthInput.expression, "cm");
            if (componentWidth <= 0.0) {
                ui.messageBox("Invalid component width: must be > 0");
                return;
            }

            afeModel.ComponentWidth = componentWidth;

            var doExtrude = extrudeInput.value;

            var extrudeHeight = unitsMgr.evaluateExpression(extrudeHeightInput.expression, "cm");
            if (extrudeHeight <= 0.0) {
                ui.messageBox("Invalid extrude height: must be > 0");
                return;
            }

            afeModel.ExtrudeHeight = extrudeHeight;

            var jointHoleDiameter = unitsMgr.evaluateExpression(jointHoleDiameterInput.expression, "cm");
            if (jointHoleDiameter <= 0.0) {
                ui.messageBox("Invalid joint hole diameter: must be > 0");
                return;
            }

            afeModel.JointHoleDiameter = jointHoleDiameter;

            // Generate the drawing
            generateDrawing(afeModel, doExtrude);
        }
        catch (e) {
            ui.messageBox('Failed to import : ' + (e.description ? e.description : e));
        }
    };

    // Convert AFE value into centimeters
    function afeVal2cm(unit, value)
    {
        if (unit === "ft")
            return (value * 12 * 2.54); // ft -> in -> cm
        else if (unit == "in")
            return (value * 2.54); // in -> cm
        else if (unit == "mm")
            return (value / 10); // mm -> cm
        else if (unit == "m")
            return (value * 100); // meter -> cm
        else
            return (+value);   // error?
    };

    // Return the Ids (keys) of a hashtable
    function hastableKeys(dict)
    {
        var ids = [];

        for (var id in dict)
        {
            if (dict.hasOwnProperty(id))
                ids.push(id);
        }

        return ids;
    };

    // Find the Joint's Point with a specified label
    function getJointPoint(joint, label)
    {
        if (!joint.Point.length)
        {
            if (joint.Point.Label === label)
                return joint.Point;
        }
        else // array
        {
            // Iterate over points
            for (var i = 0; i < joint.Point.length; ++i)
            {
                if (joint.Point[i].Label === label)
                    return joint.Point[i];
            }
        }

        return null;    // not found
    };

    // Rotate the X,Y point around the origin point.
    // Returns rotated point: {x,y}
    function rotatePoint(angleRadians, x, y, xOrigin, yOrigin)
    {
        return {
		          x: Math.cos(angleRadians) * (x-xOrigin) - Math.sin(angleRadians) * (y-yOrigin) + xOrigin,
		          y: Math.sin(angleRadians) * (x-xOrigin) + Math.cos(angleRadians) * (y-yOrigin) + yOrigin
	   };
    };

    // Parses the AFE file and populates the afeModel object.
    function parseAFEFile(filename)
    {
        // The AFE Model object
        afeModel =
        {
            Title: "",
            Filename: filename,

            LengthUnit: "ft",

            // Hashtables (id -> elem)
            Joints: {},
            Components: {},
            Supports: {},

            // Will contain bounds of all elements
            Bounds:
            {
                xMin: Number.MAX_VALUE,
                yMin: Number.MAX_VALUE,
                xMax: Number.MIN_VALUE,
                yMax: Number.MIN_VALUE
            },

            // Min/Max line lengths
            LineLengths:
            {
                min: Number.MAX_VALUE,
                max: Number.MIN_VALUE,
            },

            // Amount to scale source model when creating Fusion model.
            Scale: 1.0,

            // Amount to extrude
            ExtrudeDist: app.activeProduct.unitsManager.evaluateExpression("0.3", "cm"),

            // Set width of component bodies
            ComponentWidth: app.activeProduct.unitsManager.evaluateExpression("0.5", "cm"),

            // Set diameter of joint holes
            JointHoleDiameter: app.activeProduct.unitsManager.evaluateExpression("1", "mm")
        };

        // The current format of an AFE file comes in binary or text formats.  The
        // text file contains an XML representation while the binary also contains
        // XML as well as other binary data.
        //
        // This parsing code determines which is which by looking at the first set
        // of values in the file.  If they are text based then we assume it's a
        // text file.  Otherwise, it's a binary.  This is a hack but works for now.

        // Begin by reading in the buffer.
        var buffer = adsk.readFile(filename);
        if (!buffer) {
            ui.messageBox('Failed to open ' + filename);
            return null;
        }

        var bytes = new Uint8Array(buffer);
        if (bytes.byteLength < 20) {
            ui.messageBox('Invalid data file.  Not enough data: ' + filename);
            return null;
        }

        // At the start of a binary version of the file is a header:
        //
        // 16 bytes (?)
        // 4 bytes (length of XML section)
        // XML section
        // Remainder of binary data
        //
        // Let's look at the first set of bytes to see if they are binary or text.
        // That will determine how we parse.
        var parseBinary = false;
        var asciiChars = /^[ -~\t\n\r]+$/;
        for (var ii = 0; ii < 16; ++ii) {
            var ch = String.fromCharCode(bytes[ii]);
            if ( !asciiChars.test( ch ) ) {
                // non-ascii character
                parseBinary = true;
                break;
            }
        }

        var xmlBytes;   // This will hold the XML to parse

        // This is a binary file
        if (parseBinary) {

            // Extract the XML section length from the header
            var xmlLength = (+bytes[16]) + (256 * bytes[17]);

            // Now extract the XML.  Note, offset another 2 bytes later
            xmlBytes = bytes.subarray(20,xmlLength+20);     // args = begin, end
        }
        else {
            xmlBytes = bytes;   // XML text file so use all of it.
        }

        // Convert the model xml to a JSON string
        var xml = adsk.utf8ToString(xmlBytes);
        var jsonAFE = $.xml2json(xml);
        if (!jsonAFE) {
            ui.messageBox('Failed to convert file ' + filename);
            return null;
        }

        // Begin parsing - Extract settings from the file header.
        //
        //  <File Schema="9" Title="Diagram00014" IsImperial="1" UnitsVisible="1" LengthUnit="ft" AppType="afe"
        //        ForceUnit="lb" MovieIsValid="0" ScreenWidth="320" ScreenHeight="524" SimulationSpeed="35.000000">
        if (jsonAFE.Title) {
            afeModel.Title = jsonAFE.Title;
        }

        if (afeModel.Title === "") {
            afeModel.Title = "ForceEffect Import";
        }

        if (jsonAFE.LengthUnit) {
            afeModel.LengthUnit = jsonAFE.LengthUnit;
        }

        // Parse the "Elements"
        if (jsonAFE.Elements && jsonAFE.Elements.Ided)
        {
            for (var iElem = 0; iElem < jsonAFE.Elements.Ided.length; ++iElem)
            {
                var elem = jsonAFE.Elements.Ided[iElem];
                if (!elem.TypeID) {
                    continue;
                }

                if (elem.TypeID == "Joint")
                {
                    // <Ided TypeID="Joint" ObjectId="3" Index="1">
                    afeModel.Joints[elem.ObjectId] = elem;
                }
                else if (elem.TypeID == "Component")
                {
                    // <Ided TypeID="Component" ObjectId="2">
                    afeModel.Components[elem.ObjectId] = elem;
                }
                else if (elem.TypeID == "Support")
                {
                    // <Ided TypeID="Support" ObjectId="1">
                    afeModel.Supports[elem.ObjectId] = elem;
                }
            }
        }

        // Iterate through the elements to calc bounding box.
        var idsComps = hastableKeys(afeModel.Components);   // get Ids of components
        for (var i = 0; i < idsComps.length; ++i)
        {
            var idComp = idsComps[i];
            var comp = afeModel.Components[idComp];

            var startJoint = afeModel.Joints[comp.StartJoint.ObjId];
            var endJoint   = afeModel.Joints[comp.EndJoint.ObjId];

            if (!startJoint || !endJoint)
            {
                console.log("Error: Unable to find start or end joint");
                continue;
            }

            // Get the joint positions and convert to correct units
            var ptStart = getJointPoint(startJoint,"Origin");
            var ptEnd   = getJointPoint(endJoint,"Origin");

            var xStart = afeVal2cm(afeModel.LengthUnit, ptStart.x);
            var yStart = afeVal2cm(afeModel.LengthUnit, ptStart.y);
            var xEnd   = afeVal2cm(afeModel.LengthUnit, ptEnd.x);
            var yEnd   = afeVal2cm(afeModel.LengthUnit, ptEnd.y);

            // Track bounds of all elements
            afeModel.Bounds.xMin = Math.min(afeModel.Bounds.xMin, Math.min(xStart,xEnd));
            afeModel.Bounds.yMin = Math.min(afeModel.Bounds.yMin, Math.min(yStart,yEnd));
            afeModel.Bounds.xMax = Math.max(afeModel.Bounds.xMax, Math.max(xStart,xEnd));
            afeModel.Bounds.yMax = Math.max(afeModel.Bounds.yMax, Math.max(yStart,yEnd));

            // Length of this line
            var lineLen = Math.sqrt((xEnd -= xStart) * xEnd + (yEnd -= yStart) * yEnd);
            if (lineLen < afeModel.LineLengths.min)
                afeModel.LineLengths.min = lineLen;
            if (lineLen > afeModel.LineLengths.max)
                afeModel.LineLengths.max = lineLen;
        }

        return afeModel;
    };

    // Generate the Fusion drawing from the ForceEffect model
    var generateDrawing = function(afeModel, doExtrude) {

        if (!afeModel)
            return;

        // Get the active design.
        var product = app.activeProduct;
        var design = adsk.fusion.Design(product);
        var title = afeModel.Title + '(' + afeModel.Filename + ')';
        if (!design) {
            ui.messageBox('No active Fusion design', title);
            adsk.terminate();
            return;
        }

        var rootComp = design.rootComponent;

        // Create a pair of new sketches.
        var sketches = rootComp.sketches;
        var xzPlane = rootComp.xZConstructionPlane;

        // This sketch contains the actual layout of the parts as defined in the
        // imported model.  Additionally, part labels are added for reference by
        // the parts sketch.
        var sketchInstructions = sketches.add(xzPlane);
        sketchInstructions.name = "Instructions";

        // Begin adding INSTRUCTION geometry
        var sketchLines   = sketchInstructions.sketchCurves.sketchLines;
        var sketchArcs    = sketchInstructions.sketchCurves.sketchArcs;
        var sketchCircles = sketchInstructions.sketchCurves.sketchCircles;

        // Defer compute while sketch geometry added.
        sketchInstructions.isComputeDeferred = true;

        // The "Components" are lines that connect joints.  Iterate over
        // these and create sketch lines.
        var idsComps = hastableKeys(afeModel.Components);   // get Ids of components
        for (var iComp = 0; iComp < idsComps.length; ++iComp)
        {
            var comp = afeModel.Components[idsComps[iComp]];

            // Which joints are connected?
            var startJoint = afeModel.Joints[comp.StartJoint.ObjId];
            var endJoint   = afeModel.Joints[comp.EndJoint.ObjId];

            if (!startJoint || !endJoint)
            {
                console.log("Error: Unable to find start or end joint for component");
                continue;
            }

            // Get the joint positions and convert to correct units
            var ptStartSrc = getJointPoint(startJoint,"Origin");
            var ptEndSrc   = getJointPoint(endJoint,"Origin");

            var xStart = afeVal2cm(afeModel.LengthUnit, ptStartSrc.x) * afeModel.Scale;
            var yStart = afeVal2cm(afeModel.LengthUnit, ptStartSrc.y) * afeModel.Scale;
            var xEnd   = afeVal2cm(afeModel.LengthUnit, ptEndSrc.x)   * afeModel.Scale;
            var yEnd   = afeVal2cm(afeModel.LengthUnit, ptEndSrc.y)   * afeModel.Scale;

            var ptStart = adsk.core.Point3D.create(xStart, yStart, 0);
            var ptEnd   = adsk.core.Point3D.create(xEnd, yEnd, 0);

            // Create a line for this afe component
            var aLine = sketchLines.addByTwoPoints( ptStart, ptEnd );
            if (!aLine) {
                console.log("Error: Unable to create sketch geometry.");
            }

            // TODO: Text not supported in API
            // Create a text element to mark this line
        }

        // Enable now that geometry has been added
        sketchInstructions.isComputeDeferred = false;

        if (doExtrude)
        {
            // This sketch contains the parts of the model placed in a line and
            // labeled to match those in the instructions.

            // Array of contruction planes for each part
            var sketchPartsArray = [];

            //var sketchParts = sketches.add(xzPlane);
            //sketchParts.name = "Parts";

            // this will contain circles for cutting holes in the parts
            var sketchPartsHoles = sketches.add(xzPlane);
            sketchPartsHoles.name = "PartsHoles";

            var sketchCirclesHoles = sketchPartsHoles.sketchCurves.sketchCircles;

            // Defer compute while sketch geometry added.
            sketchPartsHoles.isComputeDeferred = true;

            var extrudeDistPerSketch = afeModel.ExtrudeDist * 1.2;

            // The "Components" are lines that connect joints.  Iterate over
            // these and create sketch lines.
            //var idsComps = hastableKeys(afeModel.Components);   // get Ids of components
            for (var iComp = 0; iComp < idsComps.length; ++iComp)
            {
                var comp = afeModel.Components[idsComps[iComp]];

                // Which joints are connected?
                var startJoint = afeModel.Joints[comp.StartJoint.ObjId];
                var endJoint   = afeModel.Joints[comp.EndJoint.ObjId];

                if (!startJoint || !endJoint)
                {
                    console.log("Error: Unable to find start or end joint for component");
                    continue;
                }

                // Create the sketch plane and sketch for this part.
                // NOTE: We need 1 sketch plane per part so that we can keep them
                // from intersecting with each other when extruded and have them
                // sit in the same location as the instructions.
                var cpi = rootComp.constructionPlanes.createInput();
                cpi.setByOffset( xzPlane, adsk.core.ValueInput.createByReal(iComp * extrudeDistPerSketch) );
                var sketchPlane = rootComp.constructionPlanes.add( cpi );
                var sketchParts = sketches.add(sketchPlane);
                sketchPartsArray.push(sketchParts);
                sketchParts.name = "Part - " + iComp;

                // Begin adding PARTS geometry
                var sketchLines   = sketchParts.sketchCurves.sketchLines;
                var sketchArcs    = sketchParts.sketchCurves.sketchArcs;
                var sketchCircles = sketchParts.sketchCurves.sketchCircles;

                // Defer compute while sketch geometry added.
                sketchParts.isComputeDeferred = true;

                // Get the joint positions and convert to correct units
                var ptStartSrc = getJointPoint(startJoint,"Origin");
                var ptEndSrc   = getJointPoint(endJoint,"Origin");

                var xStart = afeVal2cm(afeModel.LengthUnit, ptStartSrc.x) * afeModel.Scale;
                var yStart = afeVal2cm(afeModel.LengthUnit, ptStartSrc.y) * afeModel.Scale;
                var xEnd   = afeVal2cm(afeModel.LengthUnit, ptEndSrc.x)   * afeModel.Scale;
                var yEnd   = afeVal2cm(afeModel.LengthUnit, ptEndSrc.y)   * afeModel.Scale;

                var ptStart = adsk.core.Point3D.create(xStart, yStart, 0);
                var ptEnd   = adsk.core.Point3D.create(xEnd, yEnd, 0);

                // Length of this line
                //var lineLen = Math.sqrt((xEnd -= xStart) * xEnd + (yEnd -= yStart) * yEnd);

                var halfWidth = afeModel.ComponentWidth / 2;

                // Calc the angle of the line
                var angleRadians = Math.atan2(yEnd-yStart,xEnd-xStart);

                var angle90InRadians = (90 * Math.PI/180);

                var ptEdgeOffset1 = rotatePoint(angleRadians + angle90InRadians, halfWidth, 0, 0, 0);
                var ptEdgeOffset2 = rotatePoint(angleRadians - angle90InRadians, halfWidth, 0, 0, 0);

                // Edge 1
                var edge1Start = adsk.core.Point3D.create(xStart+ptEdgeOffset1.x, yStart+ptEdgeOffset1.y, 0);
                var edge1End   = adsk.core.Point3D.create(xEnd  +ptEdgeOffset1.x, yEnd  +ptEdgeOffset1.y, 0);
                var line1 = sketchLines.addByTwoPoints( edge1Start, edge1End );

                // Start arc
                var arc1  = sketchArcs.addByCenterStartSweep( ptStart, edge1Start, Math.PI );

                // Edge 2
                var edge2Start = adsk.core.Point3D.create(xStart+ptEdgeOffset2.x, yStart+ptEdgeOffset2.y, 0);
                var edge2End   = adsk.core.Point3D.create(xEnd  +ptEdgeOffset2.x, yEnd  +ptEdgeOffset2.y, 0);

                var line2 = sketchLines.addByTwoPoints( edge2Start, edge2End );

                // End arc
                var arc2  = sketchArcs.addByCenterStartSweep( ptEnd, edge2End, Math.PI );

                // These are the cutting holes and go in the other sketch
                // Start hole
                var circle1 = sketchCirclesHoles.addByCenterRadius( ptStart, afeModel.JointHoleDiameter/2 );

                // End hole
                var circle2 = sketchCirclesHoles.addByCenterRadius( ptEnd, afeModel.JointHoleDiameter/2 );

                // TODO: Text not supported in API
                // Create a text element to mark this line.  String should match the
                // one added in the instructions sketch.

                // Enable now that geometry has been added to this sketch
                sketchParts.isComputeDeferred = false;
            }

            // Enable now that geometry has been added
            sketchPartsHoles.isComputeDeferred = false;

            // Create the extrusion.
            var extrudes = rootComp.features.extrudeFeatures;

            // Keep track of timeline so we can group these operations
            var timelineStartIndex = design.timeline.count;

            for (var iSketchParts = 0; iSketchParts < sketchPartsArray.length; ++iSketchParts)
            {
                var sketchParts = sketchPartsArray[iSketchParts];

                for (var iProf = 0; iProf < sketchParts.profiles.count; ++iProf)
                {
                    var prof = sketchParts.profiles.item(iProf);
                    var extInput = extrudes.createInput(prof, adsk.fusion.FeatureOperations.NewBodyFeatureOperation);

                    var distance = adsk.core.ValueInput.createByReal(afeModel.ExtrudeDist);
                    extInput.setDistanceExtent(false, distance);
                    var ext = extrudes.add(extInput);

                    var fc = ext.faces.item(0);
                    var bd = fc.body;
                    bd.name = 'AFE Part - ' + iSketchParts+'.'+iProf;
                }
            }

            // Cut the holes
            for (var iProfHoles = 0; iProfHoles < sketchPartsHoles.profiles.count; ++iProfHoles)
            {
                var prof = sketchPartsHoles.profiles.item(iProfHoles);
                var extInput = extrudes.createInput(prof, adsk.fusion.FeatureOperations.CutFeatureOperation);

                var distance = adsk.core.ValueInput.createByReal((sketchPartsArray.length + 1) * extrudeDistPerSketch);
                extInput.setDistanceExtent(false, distance);
                var ext = extrudes.add(extInput);

                var fc = ext.faces.item(0);
                var bd = fc.body;
                bd.name = 'AFE Part - ' + iProf;
            }

            // Now group these operations in the timeline
            var timelineEndIndex = design.timeline.count - 1;
            if (timelineEndIndex > timelineStartIndex)
                design.timeline.timelineGroups.add(timelineStartIndex, timelineEndIndex);
        }

        // Now fit the view to show new items
        app.activeViewport.fit();
    };

    try {

        if (adsk.debug === true) {
            /*jslint debug: true*/
            debugger;
            /*jslint debug: false*/
        }

        // Prompt first for the name of the AFE file to import
        var dlg = ui.createFileDialog();
        dlg.title = 'Import ForceEffect File';
        dlg.filter = 'ForceEffect (*.afe);;ForceEffect Motion (*.afem);;All Files (*.*)';
        if (dlg.showOpen() !== adsk.core.DialogResults.DialogOK) {
            adsk.terminate();
            return;
        }

        filename = dlg.filename;

        // Parse the file
        afeModel = parseAFEFile(filename);

        if (afeModel) {
            // Create and run command
            var command = createCommandDefinition();
            var commandCreatedEvent = command.commandCreated;
            commandCreatedEvent.add(onCommandCreated);

            command.execute();
        }
    }
    catch (e) {
        if (ui) {
            ui.messageBox('Failed : ' + (e.description ? e.description : e));
        }

        adsk.terminate();
    }
}());
