importClass(Packages.java.io.File)
importClass(Packages.java.awt.Color)
Array.prototype.writeIndices = function( n ) {
    for( var i = 0; i < (n || this.length); ++i ) this[i] = i;
    return this;
}
var error = false;
rm = RoiManager.getInstance();
if (rm == null)
{	error = true;
	IJ.error( "ERROR! no ROI manager open!");	}

image = IJ.getImage();
originalIP = image.getProcessor();
var frames = image.getStackSize();
//*******************User Settings*********************
var finischAfterMean = false;
// *** general settings
var destDir = "sorted_output"+File.separator
var F0start = 0;
var F0end = 5;
var stimulation = 10;
var peakSearchRange = 10;
var displayRangeStart = 0;
var displayRangeEnd = frames;
var endfit = frames;
// *** auto-pick settings
var autoProcessAll = true;
var autoPickPeak = false;
var peakCriteria = 1.25;
var autoPickPositiveA = false;
var autoPickPositiveTau = false;
var searchSecondPeak = false;
var secondPeakF0Start =0// frames/2;
var secondPeakF0End = 5//frames/2 + 5;
var secondPeakStart = 20//frames/2 + 10;
var secondPeakEnd = 40//frames/ 2 + 20;
var secondPeakCriteria = 1.1;
var FlastPick = true; //*******!!! IMPLEMENT
var useEMAPeak = false;
var useEMAFit = false;
var alpha = 0.25;
var stopAfterGlobalFit = false;

// *** Output options 
var normalize = true;
var FF0 = true;
var showMonoExpFit = true;
var showEMA = false;
var ErrorBars = true;
var autoSave = true;

var showNormPlot = false;
var showFF0Plot = false;

if (!error)
{
//*******************************************************
var gd = new GenericDialog("TracePicker - Settings");

gd.addMessage("******************** General settings ***************************");

gd.addStringField("output directory: ", destDir, 21);
gd.addCheckbox("**easy-mode : simply extract mean timetrace and terminate", finischAfterMean) ;
gd.addNumericField("start frame: ", F0start, 0);
gd.addNumericField("last frame with no stimulation: ", F0end, 0);
gd.addNumericField("stimulation frame: ", stimulation, 0);
gd.addNumericField("search the following frames for peak: ", peakSearchRange, 0);
gd.addNumericField("end frame (for exp. fit & trace pick): ", endfit, 0);
gd.addNumericField("display Range (start): ", displayRangeStart, 0);
gd.addNumericField("display Range (end): ", displayRangeEnd, 0);


gd.addMessage("******************** auto-pick settings ***************************");
gd.addCheckbox("process all traces without user-interaction (uncheck for manual pick)", autoProcessAll) ;
gd.addCheckbox("auto-pick responding neurons (positive peak after stimulation)", autoPickPeak) ;
gd.addNumericField("peak criteria ( ratio Fmax/F0 )", peakCriteria, 2);
gd.addCheckbox("auto-pick only traces with positive Amplitude", autoPickPositiveA) ;
gd.addCheckbox("auto-pick only traces with positive tau", autoPickPositiveTau) ;
gd.addCheckbox("search second peak", searchSecondPeak) ;
gd.addNumericField("second peak F0 start frame", secondPeakF0Start, 0);
gd.addNumericField("second peak F0 end frame", secondPeakF0End, 0);
gd.addNumericField("second peak start frame", secondPeakStart, 0);
gd.addNumericField("second peak end frame", secondPeakEnd, 0);
gd.addNumericField("second peak criteria median(Fstart, Fend) / F0 ", secondPeakCriteria, 2);
//gd.addCheckbox("use exponential moving average (EMA) for peak finding", useEMAPeak);
//gd.addCheckbox("use EMA for fitting", useEMAFit);
//gd.addNumericField("alpha-value for EMA", alpha, 2);
gd.addCheckbox("stop before trace picking", stopAfterGlobalFit);

gd.addMessage("******************** Output options ********************");
gd.addCheckbox("(1, 0) normalized traces", normalize) ;
gd.addCheckbox("F/F0 normalized traces", FF0) ;
//gd.addCheckbox("show Mono-Exponential fit", showMonoExpFit) ;
//gd.addCheckbox("show exponential moving average (EMA)", showEMA);
//gd.addCheckbox("show ErrorBars", ErrorBars) ;
gd.addCheckbox("auto save good ROIs", autoSave) ;
gd.addMessage("Author: Georgi Tadeus, georgi.tadeus@gmail.com, under CC-SA licence");
gd.showDialog();

if (!gd.wasCanceled())
{
//*********** General settings  *********** 	
destDir = gd.getNextString();
finischAfterMean = gd.getNextBoolean();
F0start = gd.getNextNumber();
F0end = gd.getNextNumber();
stimulation = gd.getNextNumber();
peakSearchRange = gd.getNextNumber();
endfit = gd.getNextNumber();
displayRangeStart = gd.getNextNumber();
displayRangeEnd = gd.getNextNumber();

//*********** auto-pick setting  ***********
autoProcessAll = gd.getNextBoolean();
autoPickPeak = gd.getNextBoolean();
peakCriteria = gd.getNextNumber();
autoPickPositiveA = gd.getNextBoolean();
autoPickPositiveTau = gd.getNextBoolean();
searchSecondPeak = gd.getNextBoolean();
secondPeakF0Start = gd.getNextNumber();
secondPeakF0End = gd.getNextNumber();
secondPeakStart = gd.getNextNumber();
secondPeakEnd = gd.getNextNumber();
secondPeakCriteria = gd.getNextNumber();

//useEMAPeak = gd.getNextBoolean();
//useEMAFit = gd.getNextBoolean();
//alpha = gd.getNextNumber();
stopAfterGlobalFit = gd.getNextBoolean();

//*********** Output options ***********
normalize = gd.getNextBoolean();
FF0 = gd.getNextBoolean();
//showMonoExpFit = gd.getNextBoolean();
//showEMA = gd.getNextBoolean();
//ErrorBars = gd.getNextBoolean();
autoSave = gd.getNextBoolean();

if(frames == 1)
{
	IJ.log( "no stack open!");
}


var path = IJ.getDirectory("image");

path += destDir;
var newDir = new File(path);
newDir.mkdirs();
var name = image.getTitle();



var nRois = rm.getCount();
var rois = rm.getRoisAsArray();

//IJ.log( "found " + nRois + " rois");

var meansOverAllRois = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var AllRoisBGCorrected = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var AllRoisSEM = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var AllRoisSD = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var BadRois = new Array();

var meansOverGoodRois = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var GoodRoisBGCorrected = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var GoodRoisBGCorrectedNorm = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var GoodRoisBGCorrectedFF0 = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);

var GoodRoisNormalized = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var GoodRoisNormalizedSD = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var GoodRoisNormalizedSEM = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);

var GoodRoisFF0 = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var GoodRoisFF0SD = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var GoodRoisFF0SEM = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);

var GoodRoisSEM = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
var GoodRoisSD = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);

var globalBackground =new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
			var roiRawData = new  java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
			var roiRawDataBGCorr = new  java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
			var roiNormalized = new  java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);
			var roiFF0 = new  java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, frames);


for (var i = 0; i < frames; i++) 
{
	globalBackground[i] = 0;	
	meansOverAllRois[i] = 0;
	meansOverGoodRois[i] = 0;
	AllRoisBGCorrected[i] = 0;

	GoodRoisBGCorrectedNorm[i] = 0;
	GoodRoisBGCorrectedFF0[i] = 0;

	GoodRoisNormalized[i] = 0;
	GoodRoisNormalizedSD[i] = 0;
	GoodRoisNormalizedSEM[i] = 0;

	GoodRoisFF0[i] = 0;
	GoodRoisFF0SD[i] = 0;
	GoodRoisFF0SEM[i] = 0;	
					roiRawData[i] = 0;
				roiRawDataBGCorr[i] = 0;
				roiNormalized[i] = 0;
				roiFF0[i] = 0;
}
var xaxis = [].writeIndices(frames);

rtRoiRawData = ResultsTable();
rt = ResultsTable();
rtGoodRois = ResultsTable();
rtBadRois = ResultsTable();
rtGoodRoisNorm = ResultsTable();
rtGoodRoisFF0 = ResultsTable();
rtMean = ResultsTable();
rtMean.showRowNumbers(false);

var backgroundExists = false;

for(var j = 0; j < rm.getCount(); j++)
{
  if (RoiManager.getName(j) == "background")
  {
  	backgroundExists = true;
  	rm.select(j);
	image.setRoi(rois[j], false);
	
  	for (var i = 0; i < frames; i++)
	{
		image.setSliceWithoutUpdate(i+1);
		var stats = image.getStatistics();
  		globalBackground[i]=parseFloat(stats.mean);
  		rt.setValue(RoiManager.getName(j), i, parseFloat(stats.mean));
	}
  }

} 	
if( backgroundExists == false)
{
	IJ.log( "WARNING: no background defined!");
	
	var backgroundLabel = ""
	var backgroundShortLabel = ""
}
else
{
	var backgroundLabel = ", background corrected"
	var backgroundShortLabel = "_bgCorr"
	var plotBackground = Plot("Background ROI", "frames", "Mean Intensity", xaxis, globalBackground);
	plotBackground.setLimits(displayRangeStart, displayRangeEnd, min(globalBackground.slice(displayRangeStart, displayRangeEnd)), max(globalBackground.slice(displayRangeStart, displayRangeEnd)))
	FileSaver(plotBackground.getImagePlus()).saveAsPng(path+name+"_BackgroundROI.png");

}

if (finischAfterMean )
{
/*	for (var roiCounter = 0; roiCounter < nRois; roiCounter++)
	{
		var F0Array = new  java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, (F0end-F0start));
		image.setRoi(rois[roiCounter], false);	
		
		for ( var t = 0; t < (F0end-F0start); t++)
		{
			var impSlice = image.setSliceWithoutUpdate(F0end+t+1);
			var stats = image.getStatistics();
			F0Array[t] = parseFloat(stats.mean) - globalBackground[F0end+t];
		}
		var F0median = getF0(F0Array, 0, (F0end-F0start))
		for ( var t = 0; t < frames; t++)
		{
			var impSlice = image.setSliceWithoutUpdate(t+1);
			var stats = image.getStatistics();
			roiRawData[t] = parseFloat(stats.mean);
			meansOverAllRois[t]=(parseFloat(stats.mean) + roiCounter*meansOverAllRois[t]) / (roiCounter + 1);
			AllRoisBGCorrected[t] = meansOverAllRois[t] - globalBackground[t];
			rt.setValue("BGCorrMeanAll", t, AllRoisBGCorrected[t]);	
			rtMean.setValue("", t, AllRoisBGCorrected[t]);
			rt.setValue("MeanAllRois", t, meansOverAllRois[t]);
			roiRawDataBGCorr[t] = roiRawData[t] - globalBackground[t];
			roiFF0[t] = roiRawDataBGCorr[t] / F0median;
		
			var GoodRoisFF0Mean = GoodRoisFF0[t];
			GoodRoisFF0[t] = (roiFF0[t] + nRois*GoodRoisFF0[t]) / (nRois + 1);
			GoodRoisFF0SD[t] = GoodRoisFF0SD[t] + (roiFF0[t]- GoodRoisFF0Mean) * ( roiFF0[t] - GoodRoisFF0[t]);		
			
			GoodRoisFF0SD[t] = Math.sqrt(GoodRoisFF0SD[t] / (nRois-1)) ;
			GoodRoisFF0SEM[t] = GoodRoisFF0SD[t] / Math.sqrt(nRois);	
					
			rtGoodRois.setValue("FF0", t, GoodRoisFF0[t]);	
			rtGoodRois.setValue("FF0StDev", t, GoodRoisFF0SD[t]);	
			rtGoodRois.setValue("FF0SEM", t, GoodRoisFF0SEM[t]);
			//IJ.log(GoodRoisFF0[t]);
		}
	}*/
	rtGoodRois.saveAs(path+name+"_GoodRoisTraces.txt");
	if (autoSave) rm.runCommand("Save", path + "AutoSaveRoiSet.zip");	
}
for (var i = 0; i < frames; i++)
{
	image.setSliceWithoutUpdate(i+1);
	for (var j = 0; j < nRois; j++)
	{
		image.setRoi(rois[j], false);
		var stats = image.getStatistics();

		rt.setValue(RoiManager.getName(j), i, parseFloat(stats.mean));
		if (RoiManager.getName(j) != "background")
		{
			meansOverAllRois[i]=(parseFloat(stats.mean) + j*meansOverAllRois[i]) / (j + 1);
		}
	}
	AllRoisBGCorrected[i] = meansOverAllRois[i] - globalBackground[i];
	rt.setValue("BGCorrMeanAll", i, AllRoisBGCorrected[i]);	
	rtMean.setValue("", i, AllRoisBGCorrected[i]);
	rt.setValue("MeanAllRois", i, meansOverAllRois[i]);		
}
var plotAllMeans = Plot("Average over all Rois" + backgroundLabel, "frames", "Mean Intensity", xaxis, AllRoisBGCorrected);
plotAllMeans.setLimits(displayRangeStart, displayRangeEnd, min(AllRoisBGCorrected.slice(displayRangeStart, displayRangeEnd)), max(AllRoisBGCorrected.slice(displayRangeStart, displayRangeEnd)))
//plotAllMeans.show();
FileSaver(plotAllMeans.getImagePlus()).saveAsPng(path+name+"_TimeTrace" + backgroundShortLabel + ".png");
if (!finischAfterMean)
{
/*

*/	


var roiPathGoodTracesFF0Fit = path + "rois" + File.separator + "GoodTracesFF0Fit" + File.separator;
var newDir = new File(roiPathGoodTracesFF0Fit);
newDir.mkdirs();

var roiPathBadTraces = path + "rois" + File.separator + "BadTraces" + File.separator;
var newDir = new File(roiPathBadTraces);
newDir.mkdirs();
/*
var roiPathFit = path + "rois" + File.separator + "Fit" + File.separator;
var newDir = new File(roiPathFit);
newDir.mkdirs();
*/
if (normalize)
{
	var roiPathGoodTracesNorm = path + "rois" + File.separator + "GoodTracesNormalized" + File.separator;
	var newDir = new File(roiPathGoodTracesNorm);
	newDir.mkdirs();
}
/*
if ( FF0 ) 
{
	var roiPathGoodTracesFF0 = path + "rois" + File.separator + "GoodTracesF_F0" + File.separator;
	var newDir = new File(roiPathGoodTracesFF0);
	newDir.mkdirs();
}
*/
if (backgroundExists)
	plotAllMeans.addLabel(0,0, (nRois-1) + " Rois");
else
	plotAllMeans.addLabel(0,0, (nRois) + " Rois");
	
FileSaver(plotAllMeans.getImagePlus()).saveAsPng(path+name+"_MeanAllRoisRaw" + backgroundShortLabel + ".png");	

if (!File(path + "AllRoisSet.zip").exists()) bool_value=rm.runCommand("Save", path + "AllRoisSet.zip");

var FitResultsTable = ResultsTable();

if ( !useEMAPeak ) 
{
	var Fmax = getFmax(AllRoisBGCorrected, stimulation, peakSearchRange)
}
else
{
	var Fmax = getFmax(EMA(AllRoisBGCorrected.slice(F0start, frames), alpha), stimulation, peakSearchRange)
}

var FmaxFrameGlobal = Fmax.frame
var F0 = median(AllRoisBGCorrected.slice(F0start, F0end))
var FmaxF0global = Fmax.Fmax/F0;

if ( !useEMAFit ) 
{
	var fitResults = doExpFit(AllRoisBGCorrected.slice(Fmax.frame, endfit));
}
else
{
	var fitResults = doExpFit(EMA(AllRoisBGCorrected.slice(Fmax.frame, endfit), alpha));
}

	
FitResultsTable.setValue("tau", 0, fitResults.tau);
FitResultsTable.setValue("A", 0, fitResults.A);
FitResultsTable.setValue("y0", 0, fitResults.y0);
FitResultsTable.setValue("Fmax", 0, Fmax.Fmax);
FitResultsTable.setValue("F0", 0, F0);
FitResultsTable.setValue("Fmax/F0", 0, FmaxF0global);
FitResultsTable.setValue("Fmax frame", 0, Fmax.frame);
FitResultsTable.setValue("status", 0, 1);
FitResultsTable.addLabel("Name", "AllROIs");
		
var globalTau = fitResults.tau

if ( showMonoExpFit || showEMA )
{
	
	plotRoiFit = Plot("All ROIs "+ backgroundLabel, "frames", "Mean Intensity", xaxis, AllRoisBGCorrected);	
	plotRoiFit.setLimits(displayRangeStart, displayRangeEnd, min(AllRoisBGCorrected.slice(displayRangeStart, displayRangeEnd)), max(AllRoisBGCorrected.slice(displayRangeStart, displayRangeEnd)))
	if (backgroundExists)
		plotRoiFit.addLabel(0,0.1, (nRois-1) + " Rois");
	else
		plotRoiFit.addLabel(0,0.1, (nRois) + " Rois");
	
}

if (showMonoExpFit) 
{
	plotRoiFit.setLineWidth(2)
	plotRoiFit.setColor(Color.RED);
	plotRoiFit.addPoints(xaxis.slice(Fmax.frame, endfit), fitResults.ModelArray, Plot.LINE);
	plotRoiFit.setColor(Color.BLACK);
	plotRoiFit.setLineWidth(1)
	plotRoiFit.addLabel(0, 0, fitResults.result);
}
if(showEMA)
{
	plotRoiFit.setLineWidth(2)
	plotRoiFit.setColor(Color.BLUE);
	plotRoiFit.addPoints(xaxis.slice(F0start, frames), EMA(AllRoisBGCorrected.slice(F0start, frames), alpha), Plot.LINE);	
	plotRoiFit.addLabel(0.7, 0.1, "EMA alpha = " + alpha);			
	plotRoiFit.setColor(Color.BLACK);
	plotRoiFit.setLineWidth(1);
}
if ( showMonoExpFit || showEMA )
{
	//plotRoiFit.show()
	//FileSaver(plotRoiFit.getImagePlus()).saveAsPng(path+name+"_AllROIsFit"+backgroundShortLabel+".png");
}
else
{
	//plotAllMeans.show()
}


	

if (!autoProcessAll)
{
	var MeansWindow = plotAllMeans.show();
	var Continue = new YesNoCancelDialog(null,"pHlourin Analyzer", "Continue with manual Trace-picking?");	
	if( !Continue.yesPressed() ) stopAfterGlobalFit = true;
}

if (!stopAfterGlobalFit)
{
	FitResultsTable.incrementCounter();
	var Cancel = false;
	var GoodRoisCount = 0;
	
	for (var roiCounter = 0; roiCounter < nRois; roiCounter++)
	{
		if ( ! Cancel && RoiManager.getName(roiCounter) != "background" )
		{
			IJ.log("Processing " + roiname + " [" + (roiCounter+1) + "/"+nRois+"] ...");
			var roiname = RoiManager.getName(roiCounter);	
		
			for (var i = 0; i < roiRawData.length; i++) 
			{
				roiRawData[i] = 0;
				roiRawDataBGCorr[i] = 0;
				roiNormalized[i] = 0;
				roiFF0[i] = 0;
			}
			
			image.setRoi(rois[roiCounter], false);
			var roi = image.getRoi();	
			var roiSize = roi.getBounds();
		
			for ( var t = 0; t < frames; t++)
			{
				var impSlice = image.setSliceWithoutUpdate(t+1);
				//var pixels = image.getProcessor().crop().convertToFloat().getPixels();	
				//var fp = new FloatProcessor(roiSize.width, roiSize.height, pixels);			
				var stats = image.getStatistics();
				roiRawData[t] = parseFloat(stats.mean);
				roiRawDataBGCorr[t] = roiRawData[t] - globalBackground[t];
			}
					
			roiNormalized = normalizeRange(roiRawDataBGCorr, F0start, F0end, stimulation, peakSearchRange);		
			roiFF0 = normalizeFF0(roiRawDataBGCorr, F0start, F0end); 
			
			//plotRoiRaw=Plot(roiname + "raw" + backgroundLabel, "frames", "Mean Intensity", xaxis, roiRawDataBGCorr);
			//plotRoiRaw.setLimits(displayRangeStart, displayRangeEnd, min(roiRawDataBGCorr.slice(displayRangeStart, displayRangeEnd)), max(roiRawDataBGCorr.slice(displayRangeStart, displayRangeEnd)))
			plotRoiFF0Fit=Plot(roiname + "raw" + backgroundLabel, "frames", "Mean Intensity", xaxis, roiFF0);
			plotRoiFF0Fit.setLimits(displayRangeStart, displayRangeEnd, min(roiFF0.slice(displayRangeStart, displayRangeEnd)), max(roiFF0.slice(displayRangeStart, displayRangeEnd)))
			if (!autoProcessAll) var plotWindow=plotRoiFF0Fit.show();

			
			var OK = false;
			if (!autoProcessAll)
			{
				var gd = new GenericDialog("pHlourin Analyzer");
				gd.addMessage("is this trace acceptable?");
				gd.enableYesNoCancel();
				gd.setLocation(200, 300);
				gd.centerDialog(false);
				gd.showDialog();
				if (gd.wasCanceled()) Cancel = true;
				else if (gd.wasOKed()) OK = true;
				else	OK = false;
	
			}
			else
			{
				OK = true;
				if ( !useEMAPeak ) 
				{
					// Fmax from Raw Data?
					//var Fmax = getFmax(roiRawDataBGCorr, stimulation, peakSearchRange)
					//Fmax from F0 trace
					var Fmax = getFmax(roiFF0, stimulation, peakSearchRange)
				}
				else
				{
					//var Fmax = getFmax(EMA(roiRawDataBGCorr, alpha), stimulation, peakSearchRange)
					var Fmax = getFmax(EMA(roiFF0, alpha), stimulation, peakSearchRange)
				}
					
				/*var F0 = median(roiRawDataBGCorr.slice(F0start, F0end))
				var Flast = median(roiRawDataBGCorr.slice(0.9*frames, frames))		
				var FmaxF0 = Fmax.Fmax/F0;*/
				var F0 = median(roiFF0.slice(F0start, F0end))
				var Flast = median(roiFF0.slice(0.9*frames, frames))		
				//var Flast = median(roiFF0.slice(20, 40))
				var FmaxF0 = Fmax.Fmax/F0;
				var secondPeakF0 =  median ( roiFF0.slice(secondPeakF0Start, secondPeakF0End) );
				var secondPeakMedian = median ( roiFF0.slice(secondPeakStart, secondPeakEnd) ) / secondPeakF0;
				
				//var Flast = median(roiFF0.slice(0.9*frames, frames));
				//var Flast = median(roiFF0.slice(40, 60));
				
				if ( !useEMAFit ) 
				{
					//var fitResults = doExpFit(roiRawDataBGCorr.slice(Fmax.frame, endfit));
					var fitResults = doExpFit(roiFF0.slice(Fmax.frame, endfit));
				}
				else
				{
					//var fitResults = doExpFit(EMA(roiRawDataBGCorr.slice(Fmax.frame, endfit), alpha));
					var fitResults = doExpFit(EMA(roiFF0.slice(Fmax.frame, endfit), alpha));
				}
				if ( showMonoExpFit || showEMA ) 
				{
					//plotRoiFit=Plot(roiname + backgroundLabel, "frames", "Mean Intensity", xaxis, roiRawDataBGCorr);
					//plotRoiFit.setLimits(displayRangeStart, displayRangeEnd, min(roiRawDataBGCorr.slice(displayRangeStart, displayRangeEnd)), max(roiRawDataBGCorr.slice(displayRangeStart, displayRangeEnd)))
					plotRoiFit=Plot(roiname + backgroundLabel, "frames", "Mean Intensity", xaxis, roiFF0);
					plotRoiFit.setLimits(displayRangeStart, displayRangeEnd, min(roiFF0.slice(displayRangeStart, displayRangeEnd)), max(roiFF0.slice(displayRangeStart, displayRangeEnd)))
					
				}
				if (showMonoExpFit) 
				{
					plotRoiFF0Fit.setLineWidth(2);
					plotRoiFF0Fit.setColor(Color.RED);
					plotRoiFF0Fit.addPoints(xaxis.slice(Fmax.frame, endfit), fitResults.ModelArray, Plot.LINE);
					plotRoiFF0Fit.setColor(Color.BLACK);
					plotRoiFF0Fit.setLineWidth(1);
					plotRoiFF0Fit.addLabel(0, 0, fitResults.result);
				}
				if(showEMA)
				{
					plotRoiFF0Fit.setLineWidth(2)
					plotRoiFF0Fit.setColor(Color.BLUE);
					//plotRoiFit.addPoints(xaxis.slice(F0start, frames), EMA(roiRawDataBGCorr.slice(F0start, frames), alpha), Plot.LINE);
					plotRoiFF0Fit.addPoints(xaxis.slice(F0start, frames), EMA(roiFF0.slice(F0start, frames), alpha), Plot.LINE);
					plotRoiFF0Fit.addLabel(0.7, 0.1, "EMA alpha = " + alpha);			
					plotRoiFF0Fit.setColor(Color.BLACK);
					plotRoiFF0Fit.setLineWidth(1)
				}
				if ( showMonoExpFit || showEMA ) //FileSaver(plotRoiFit.getImagePlus()).saveAsPng(roiPathFit+name+roiname+"_fit.png");
				FitResultsTable.addValue("tau",  fitResults.tau);
				FitResultsTable.addValue("A",  fitResults.A);
				FitResultsTable.addValue("y0",  fitResults.y0);
				FitResultsTable.addValue("Fmax", Fmax.Fmax);
				FitResultsTable.addValue("F0",  F0);
				FitResultsTable.addValue("Fmax/F0",  FmaxF0);
				FitResultsTable.addValue("Fmax frame",  Fmax.frame);
				FitResultsTable.addValue("secondF0",  secondPeakF0);
				FitResultsTable.addValue("secondFmedian",  secondPeakMedian);

				FitResultsTable.addLabel("Name", roiname);

				if ( FlastPick )
				{
					if (  Flast >  Fmax.Fmax)	OK = false
				}
				if ( autoPickPeak )
				{
					
					if (  FmaxF0 <= peakCriteria || Fmax.frame == stimulation )
					{	
						OK = false;
					}
					
				}
				if ( autoPickPositiveA )
				{
					if (  fitResults.A <= 0 )	OK = false
					
				}
				if ( autoPickPositiveTau )
				{
					if (  fitResults.tau <= 0 )	OK = false
					
				}
				if (searchSecondPeak)
				{
					
					if ( secondPeakMedian <= secondPeakCriteria )
					{
						OK = false;
					}
				}
				
				/*	
				if ( median ( roiRawDataBGCorr.slice(frames-10, frames) )  median ( roiRawDataBGCorr.slice(90, 110) ) )
					OK = false;*/
					
				//if (Flast >= *F0)
				if (OK)
					FitResultsTable.addValue("status", 1);
				else
					FitResultsTable.addValue("status", 0);
	
				if (roiCounter < (nRois-2))
					FitResultsTable.incrementCounter();
			
			}
			
			if (OK)
			{
				FileSaver(plotRoiFF0Fit.getImagePlus()).saveAsPng(roiPathGoodTracesFF0Fit+name+roiname+"_FF0Fit.png");
				for ( var t = 0; t < frames; t += 1)
				{	
					var impSlice = image.setSliceWithoutUpdate(t+1);
					var stats = image.getStatistics();
					rtGoodRois.setValue(RoiManager.getName(roiCounter), t, parseFloat(stats.mean));	

					if (normalize) rtGoodRoisNorm.setValue(RoiManager.getName(roiCounter), t, roiNormalized[t]);
					if (FF0) rtGoodRoisFF0.setValue(RoiManager.getName(roiCounter), t, roiFF0[t]);
	
					var oldGoodRoiMean = meansOverGoodRois[t];
					meansOverGoodRois[t]=(parseFloat(stats.mean) + GoodRoisCount*meansOverGoodRois[t]) / (GoodRoisCount + 1);
					GoodRoisSD[t] = GoodRoisSD[t] + (parseFloat(stats.mean)- oldGoodRoiMean) * ( parseFloat(stats.mean) - meansOverGoodRois[t]);
					
					var oldGoodRoiNormMean = GoodRoisNormalized[t];
					GoodRoisNormalized[t] = (roiNormalized[t] + GoodRoisCount*GoodRoisNormalized[t]) / (GoodRoisCount + 1);
					GoodRoisNormalizedSD[t] = GoodRoisNormalizedSD[t] + (roiNormalized[t]- oldGoodRoiNormMean) * ( roiNormalized[t] - GoodRoisNormalized[t]);

					var GoodRoisFF0Mean = GoodRoisFF0[t];
					GoodRoisFF0[t] = (roiFF0[t] + GoodRoisCount*GoodRoisFF0[t]) / (GoodRoisCount + 1);
					GoodRoisFF0SD[t] = GoodRoisFF0SD[t] + (roiFF0[t]- GoodRoisFF0Mean) * ( roiFF0[t] - GoodRoisFF0[t]);
				}
				GoodRoisCount++;
				
				var plotGoodNorm=Plot(roiname + " (normalized)", "frames", "Mean Intensity", xaxis, roiNormalized);
				plotGoodNorm.setLimits(displayRangeStart, displayRangeEnd, min(roiNormalized.slice(displayRangeStart, displayRangeEnd)), max(roiNormalized.slice(displayRangeStart, displayRangeEnd)))
				if (normalize) FileSaver(plotGoodNorm.getImagePlus()).saveAsPng(roiPathGoodTracesNorm+name+roiname+"_NormBgCorr.png");
				/*
				var plotGoodFF0 = Plot(roiname + " (F/F0)", "frames", "Mean Intensity", xaxis, roiFF0);
				plotGoodFF0.setLimits(displayRangeStart, displayRangeEnd, min(roiFF0.slice(displayRangeStart, displayRangeEnd)), max(roiFF0.slice(displayRangeStart, displayRangeEnd)))
				if(FF0) FileSaver(plotGoodFF0.getImagePlus()).saveAsPng(roiPathGoodTracesFF0+name+roiname+"_FF0.png");
				*/
			}
			else
			{
				FileSaver(plotRoiFF0Fit.getImagePlus()).saveAsPng(roiPathBadTraces+name+roiname+"_FF0Fit.png");
				for ( var t = 0; t < frames; t += 1)
				{	
					var impSlice = image.setSliceWithoutUpdate(t+1);
					image.setRoi(rois[roiCounter], false);
					var stats = image.getStatistics();
					rtBadRois.setValue(RoiManager.getName(roiCounter), t, parseFloat(stats.mean));	
				}
				rm.select(roiCounter);
				BadRois.push(rm.getSelectedIndex());
				//IJ.log("bad roi: " + rm.getSelectedIndex());

			}		
			if (!autoProcessAll) plotWindow.close();				
		}
	
	}
	if ( ! Cancel )
	{
		//GoodRoisCount--;
		for ( var i = 0; i < frames; i += 1) GoodRoisBGCorrected[i] = meansOverGoodRois[i] - globalBackground[i];
		
		// calculate proper F0
		//GoodRoisBGCorrectedNorm = normalizeRange(GoodRoisBGCorrected, F0start, F0end, stimulation, peakSearchRange);		
		//GoodRoisBGCorrectedFF0 = normalizeFF0(GoodRoisBGCorrected, F0start, F0end); 
		
		for ( var i = 0; i < frames; i += 1)
		{			
			rtGoodRois.setValue("BgCorrMean", i, GoodRoisBGCorrected[i]);	
			rtGoodRois.setValue("background", i, globalBackground[i]);	
			rtGoodRois.setValue("Mean", i, meansOverGoodRois[i]);
			
			rtMean.setValue("", i, AllRoisBGCorrected[i]);
			
			GoodRoisNormalizedSD[i] = Math.sqrt(GoodRoisNormalizedSD[i] / (GoodRoisCount-1)) ;
			GoodRoisNormalizedSEM[i] = GoodRoisNormalizedSD[i] / Math.sqrt(GoodRoisCount);		
			GoodRoisFF0SD[i] = Math.sqrt(GoodRoisFF0SD[i] / (GoodRoisCount-1)) ;
			GoodRoisFF0SEM[i] = GoodRoisFF0SD[i] / Math.sqrt(GoodRoisCount);
			
			if (normalize)
			{			
				rtGoodRoisNorm.setValue("Mean", i, GoodRoisNormalized[i]);	
				rtGoodRoisNorm.setValue("StDev", i, GoodRoisNormalizedSD[i]);	
				rtGoodRoisNorm.setValue("SEM", i, GoodRoisNormalizedSEM[i]);
	
				rtGoodRois.setValue("NormMean", i, GoodRoisNormalized[i]);	
				rtGoodRois.setValue("NormStDev", i, GoodRoisNormalizedSD[i]);	
				rtGoodRois.setValue("NormSEM", i, GoodRoisNormalizedSEM[i]);				
			}			
			if (FF0)
			{			
				rtGoodRoisFF0.setValue("Mean", i, GoodRoisFF0[i]);	
				rtGoodRoisFF0.setValue("StDev", i, GoodRoisFF0SD[i]);	
				rtGoodRoisFF0.setValue("SEM", i, GoodRoisFF0SEM[i]);
				
				// old F0 doesnt make sense!
				//rtGoodRois.setValue("F_F0", i, GoodRoisBGCorrectedFF0[i]);
				//rtGoodRois.setValue("F_F0StDev", i, GoodRoisFF0SD[i]);	
				//rtGoodRois.setValue("F_F0SEM", i, GoodRoisFF0SEM[i]);		
				
				rtGoodRois.setValue("FF0", i, GoodRoisFF0[i]);	
				rtGoodRois.setValue("FF0StDev", i, GoodRoisFF0SD[i]);	
				rtGoodRois.setValue("FF0SEM", i, GoodRoisFF0SEM[i]);			
				

			}			
		
		}
		
		//rt.saveAs(path+name+"_AllTraces.txt");
		rtGoodRois.saveAs(path+name+"_GoodRoisTraces.txt");
		rtBadRois.saveAs(path+name+"_BadRoisTraces.txt");
		
				
		/*var plotGoodMeans=Plot("Average over good Rois", "frames", "Mean Intensity", xaxis, meansOverGoodRois);
		plotGoodMeans.addLabel(0, 0, GoodRoisCount + " Rois");
		FileSaver(plotGoodMeans.getImagePlus()).saveAsPng(path+name+"_AverageAllGoodRois.png");*/

		if(normalize)
		{
			var plotGoodMeansNorm=Plot("Average (normalized)", "frames", "Mean Intensity", xaxis, GoodRoisNormalized);
			plotGoodMeansNorm.setLimits(displayRangeStart, displayRangeEnd, min(GoodRoisNormalized.slice(displayRangeStart, displayRangeEnd)), max(GoodRoisNormalized.slice(displayRangeStart, displayRangeEnd)))
			if(ErrorBars)
			{
				plotGoodMeansNorm.addErrorBars(GoodRoisNormalizedSEM);
				plotGoodMeansNorm.addLabel(0,0,GoodRoisCount + " Rois, Mean ± SEM");
			}
			else
			{
				plotGoodMeansNorm.addLabel(0,0,GoodRoisCount + " Rois");
			}
			
			
			if (showNormPlot) plotGoodMeansNorm.show();
			FileSaver(plotGoodMeansNorm.getImagePlus()).saveAsPng(path+name+"_MeanGoodRoisNormalized.png");
			rtGoodRoisNorm.saveAs(path+name+"_GoodRoisTracesNorm.txt");
		}
		
		if (FF0)
		{
			//var plotGoodMeansFF0=Plot("Average (F/F0)", "frames", "Mean Intensity", xaxis, GoodRoisBGCorrectedFF0);
			//plotGoodMeansFF0.setLimits(displayRangeStart, displayRangeEnd, min(GoodRoisBGCorrectedFF0.slice(displayRangeStart, displayRangeEnd)), max(GoodRoisBGCorrectedFF0.slice(displayRangeStart, displayRangeEnd)))
			var plotGoodMeansFF0=Plot("Average (F/F0)", "frames", "Mean Intensity", xaxis, GoodRoisFF0);
			plotGoodMeansFF0.setLimits(displayRangeStart, displayRangeEnd, min(GoodRoisFF0.slice(displayRangeStart, displayRangeEnd)), max(GoodRoisFF0.slice(displayRangeStart, displayRangeEnd)))
			if(ErrorBars)
			{
				plotGoodMeansFF0.addErrorBars(GoodRoisFF0SEM);
				plotGoodMeansFF0.addLabel(0,0,GoodRoisCount + " Rois, Mean ± SEM");
			}
			else
			{
				plotGoodMeansFF0.addLabel(0,0,GoodRoisCount + " Rois");
			}
			
			if (showFF0Plot) plotGoodMeansFF0.show();
			FileSaver(plotGoodMeansFF0.getImagePlus()).saveAsPng(path+name+"_MeanGoodRoisFF0.png");
			rtGoodRoisFF0.saveAs(path+name+"_GoodRoisTracesFF0.txt");
		}
		
		var plotGoodMeansBgCorr=Plot("Average over good Rois" + backgroundLabel, "frames", "Mean Intensity", xaxis, GoodRoisBGCorrected);
		plotGoodMeansBgCorr.setLimits(displayRangeStart, displayRangeEnd, min(GoodRoisBGCorrected.slice(displayRangeStart, displayRangeEnd)), max(GoodRoisBGCorrected.slice(displayRangeStart, displayRangeEnd)))	
		
		if ( !useEMAPeak ) 
		{
			var Fmax = getFmax(GoodRoisBGCorrected, stimulation, peakSearchRange)
		}
		else
		{
			var Fmax = getFmax(EMA(GoodRoisBGCorrected.slice(F0start, frames), alpha), stimulation, peakSearchRange)
		}
			
		var F0 = median(GoodRoisBGCorrected.slice(F0start, F0end))
		var FmaxF0 = Fmax.Fmax/F0;
		
		if ( !useEMAFit ) 
		{
			var fitResults = doExpFit(GoodRoisBGCorrected.slice(Fmax.frame, endfit));
		}
		else
		{
			var fitResults = doExpFit(EMA(GoodRoisBGCorrected.slice(Fmax.frame, endfit), alpha));
		}
		//if ( showMonoExpFit || showEMA ) plotRoiFit=Plot(roiname + backgroundLabel, "frames", "Mean Intensity", xaxis, GoodRoisBGCorrected);
		if(showMonoExpFit) 
		{
			plotGoodMeansBgCorr.setLineWidth(2)
			plotGoodMeansBgCorr.setColor(Color.RED);
			plotGoodMeansBgCorr.addPoints(xaxis.slice(Fmax.frame, endfit), fitResults.ModelArray, Plot.LINE);
			plotGoodMeansBgCorr.setColor(Color.BLACK);
			plotGoodMeansBgCorr.setLineWidth(1)
			plotGoodMeansBgCorr.addLabel(0,0,fitResults.result + "\r\n" + GoodRoisCount + " Rois");
		}
		else
			plotGoodMeansBgCorr.addLabel(0,0, GoodRoisCount + " Rois");
			
		if(showEMA)
		{
			plotGoodMeansBgCorr.setLineWidth(2)
			plotGoodMeansBgCorr.setColor(Color.BLUE);
			plotGoodMeansBgCorr.addPoints(xaxis.slice(F0start, frames), EMA(GoodRoisBGCorrected.slice(F0start, frames), alpha), Plot.LINE);				
			plotGoodMeansBgCorr.addLabel(0.7, 0.1, "EMA alpha = " + alpha);
			plotGoodMeansBgCorr.setColor(Color.BLACK);
			plotGoodMeansBgCorr.setLineWidth(1)
		}
		if ( showMonoExpFit || showEMA )// FileSaver(plotGoodMeansBgCorr.getImagePlus()).saveAsPng(path+name+"_AverageAllGoodRois.png");
		
		FitResultsTable.addValue("tau",  fitResults.tau);
		FitResultsTable.addValue("A",  fitResults.A);
		FitResultsTable.addValue("y0",  fitResults.y0);
		FitResultsTable.addValue("Fmax", Fmax.Fmax);
		FitResultsTable.addValue("F0",  F0);
		FitResultsTable.addValue("Fmax/F0",  FmaxF0);
		FitResultsTable.addValue("Fmax frame",  Fmax.frame);
		FitResultsTable.addLabel("Name", "Good ROIs");
			
		plotGoodMeansBgCorr.show();
		
		FileSaver(plotGoodMeansBgCorr.getImagePlus()).saveAsPng(path+name+"_AverageAllGoodRois"+backgroundShortLabel+".png");

		IJ.log("deleting " + BadRois.length + " rois");
		
		for (var i = 0; i < BadRois.length; i++)
		{		
			rm.select(BadRois[i]-i);
			rm.runCommand("Delete");
		}
		if (autoSave) rm.runCommand("Save", path + "GoodRoiSet.zip");	
		IJ.log("ready!");
	}
	else
	{
		IJ.log("cancelled by user");
	}
		
}
else
{
	IJ.log("cancelled by user");
}
//MeansWindow.close();
FitResultsTable.saveAs(path+name+"_FitResults.txt");

} // easy mode end

rt.saveAs(path+name+"_AllTraces.txt");
rtMean.saveAs(path+name+"_MeanTimeTrace.txt");
} // gd.was not cancelled

	//FitResultsTable.setPrecision(5);
	//FitResultsTable.show("FitResults");
	

} // no error


function Matrix3x3Inverse(A)
{
	var m = A.length;
	var n = A[0].length;
	
	var a = A[0][0]
	var b = A[0][1]
	var c = A[0][2]
	
	var d = A[1][0]
	var e = A[1][1]
	var f = A[1][2]

	var g = A[2][0]
	var h = A[2][1]
	var k = A[2][2]
	
	var detA = a*(e*k-f*h)-b*(k*d-f*g)+c*(d*h-e*g);
	var invA = new Array(m);
	for (var i = 0; i < m; i++)
	{
		invA[i] = new Array(n);
		for (var j = 0; j < n; j++) 
		{
    			invA[i][j] = 0;
  		}
	}	
	invA[0][0] = (e*k-f*h)/detA
	invA[0][1] = -(b*k-c*h)/detA
	invA[0][2] = (b*f-c*e)/detA
	
	invA[1][0] = -(d*k-f*g)/detA
	invA[1][1] = (a*k-c*g)/detA
	invA[1][2] = -(a*f-c*d)/detA
	
	invA[2][0] = (d*h-e*g)/detA
	invA[2][1] = -(a*h-b*g)/detA
	invA[2][2] = (a*e-b*d)/detA

	return invA
}
function MatrixMult(A, B)//a[m][n], b[n][p]
{
	var n = A[0].length;
	var m = A.length;
	var p = B[0].length;
		
	var ans  = [[,],[,]];

	var ans = new Array(m);
	for (var i = 0; i < m; i++) 
	{
  		ans[i] = new Array(p);
  		for (var j = 0; j < p; j++) 
  		{
    			ans[i][j] = 0;
  		}
	}
	for(var i = 0;i < m;i++)
		for(var j = 0;j < p;j++)
			for(var k = 0;k < n;k++)
				ans[i][j] += A[i][k] * B[k][j];

   	return ans;
}

function guessP(y)
{
	var n = y.length
	var Yoi = new Array(n)
	
	var B11=0, B12=0, B13=0, B21=0, B22=0, B23=0, B31=0, B32=0, B33=0
	var C1=0, C2=0, C3=0
	var sumyoi = 0
	for(var i = 0; i < n; i+=1)
	{
		sumyoi+=y[i]
		Yoi[i] = sumyoi
	}	
	for(var i = 0; i < n; i+=1)
	{
		B11+=(Yoi[i]*Yoi[i])
		B12+=((i+1)*Yoi[i])
		B13+=Yoi[i]
		B21+=((i+1)*Yoi[i])
		B22+=((i+1)*(i+1))
		B23+=(i+1)
		B31=B13
		B32=B23
		B33=n
		C1 += ( Yoi[i]*y[i] )
		C2 += ( (i+1) * y[i] )
		C3 += (y[i] )
	}
	
	var matA=[[B11, B12, B13], [B21, B22, B23], [B31, B32, B33]]
	var matB= [[C1], [C2], [C3]]
	var invA = Matrix3x3Inverse(matA)
	var result = MatrixMult(invA, matB)
	
	return 1/(1-result[0][0])	
}

function sumpi(p, n)
{
	return (p/(1-p)) * (1-Math.pow(p, n))
}
function sumipi(p, n)
{
	return ( p / Math.pow( 1-p, 2) ) * ( 1- ( n * ( 1-p) +1) * Math.pow(p, n))
}
function sumi2pi(p, n)
{
	return ( p / Math.pow(1-p, 3) ) * ( 1 + p - ( Math.pow( n*(1-p)+1 ,2) + p ) * Math.pow(p,n))
}

function dF1dp(p, y)
{
	var n = y.length, i = 0;
	var sum1 = 0, sum2 = 0
	for ( i = 0; i < n ; i += 1)
	{
		sum1+= ( y[i]*(i+1) * Math.pow(p, i+1))
		sum2+= y[i]
	}
	return ( 1/p ) * ( n*sum1 - sum2*sumipi(p, n) )
}

function dF2dp(p, y)
{
	var n = y.length	
	return (2/p) * (n + sumipi(Math.pow(p, 2), n) - sumpi(p, n)*sumipi(p, n) )
}

function dF3dp(p, y)
{
	var n = y.length, i = 0
	var sum1=0, sum2 =0, sum3=0
	for ( i = 0; i < n ; i += 1)
	{
		sum1+= y[i]
		sum2+= (y[i]*Math.pow(p, i+1))
		sum3+=(y[i]*(i+1)*Math.pow(p, i+1))
	}	
	return (1/p) * ( 2* sum1*sumipi(Math.pow(p, 2), n)*n*sumipi(Math.pow(p, 2), n)-sumipi(p, n) * sum2 - sumpi(p, n)*sum3)
}

function dadp(p, y)
{
	return (F2(p, y) * dF2dp(p, y) - F1(p, y)*dF2dp(p,y)) / Math.pow(F2(p, y), 2)
}

function dcdp(p, y)
{
	return (F2(p, y) * dF3dp(p, y) - F3(p, y)*dF2dp(p,y)) / Math.pow(F2(p, y), 2)
}

function F1(p, y)
{
	var n = y.length, i = 0
	var sum1=0, sum2 =0
	for ( i = 0; i < n ; i += 1)
	{
		sum1+= ( y[i] * Math.pow(p, i+1))
		sum2+= y[i]
	}	
	return n*sum1-sum2*sumpi(p, n)
}

function F2(p, y)
{
	var n = y.length
	return n * sumpi(Math.pow(p, 2), n) - Math.pow(sumpi(p, n), 2) 
}

function F3(p, y)
{
	var n = y.length, i = 0
	var sum1=0, sum2 =0
	for ( i = 0; i < n ; i += 1)
	{
		sum1+= y[i]
		sum2+= ( y[i] * Math.pow(p, i+1))
	}
	
	return sum1*sumpi(Math.pow(p, 2), n)-sum2*sumpi(p, n)
}

function F(p, y)
{
	var n = y.length, i=0, sum1=0
	for ( i = 0; i < n ; i += 1)
		sum1+= ( (i+1) * y[i] * Math.pow(p, i+1) )
	
	return (F1(p,y)/F2(p,y))*sumipi(Math.pow(p, 2), n) + (F3(p,y)/F2(p,y))*sumipi(p, n) - sum1
}
function dFdp(p, y)
{
	var n = y.length, i = 0
	var sum1=0, sum2 =0
	for ( i = 0; i < n ; i += 1)
		sum1+= (y[i] * Math.pow(i+1, 2) * Math.pow(p, i+1) )
	return dadp(p, y)*sumipi(Math.pow(p, 2), n)+dcdp(p, y)*sumipi(p, n)+(2*(F1(p,y)/F2(p,y)) / p)* sumi2pi(Math.pow(p, 2), n)+ ((F3(p,y)/F2(p,y)) / p) * sumi2pi(p, n) - (1/p) * sum1
}
function doExpFit(y)
{
	var xaxis = [].writeIndices(y.length);
	var fitModelOutput = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, xaxis.length);	
	var p = guessP(y)

	var pnew = 1
	var e = 0.001
	while(1)
	{
		if( Math.log(pnew/p) > e)
		{	
			pnew = p - F(p, y) / dFdp(p, y)
			p = pnew
		}
		else{
			for( var i = 0; i < xaxis.length; i+=1)
				fitModelOutput[i] = ( F1(p, y) / F2(p, y) )*Math.exp( Math.log(p)*(xaxis[i]) ) + ( F3(p, y) / F2(p, y) );

			return {
        			'A': ( F1(p, y) / F2(p, y) ),
        			'y0': ( F3(p, y) / F2(p, y) ),
        			'tau': (-1/Math.log(p)),
        			'ModelArray': fitModelOutput,
        			'bleachRate':(1-p),
        			'result': "A = " + ( F1(p, y) / F2(p, y) ) + " ; tau = " + (-1/Math.log(p)) + " ; y0 = " +( F3(p, y) / F2(p, y) ) +""
        		}; 
		}
	}	
}
function getF0(array, F0start, F0end)
{
	var output = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, array.length);
	var minArray  = new Array(F0end-F0start);
	for (var j = 0; j < (F0end-F0start); j++)
		minArray[j]=array[F0start+j];

	return median(minArray);;
}	


function EMA(array, alpha)
{	
	var output = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, array.length);	
	output[0] = array[0];
	
	for(var i = 1; i < array.length; i+=1)
	{
		output[i] = alpha * array[i-1]+(1-alpha)*output[i-1]
	}
	
	return output;
	
}
function median(array) 
{
	array.sort(function(a,b){return a - b})
    	var middle = Math.floor(array.length/2);
    	if (array.length%2 == 1) 
    	{
        	return array[middle];
        }
        else
        {
        	return (array[middle-1] + array[middle]) / 2.0;
    	}
}

function min(array)
{
	var min = array[0];	
	for(var i = 0; i < array.length; i++)
	{
		if ( array[i] < min )
		{
			min = array[i];
		}
	}
	return min;
}

function max(array)
{
	var max = array[0];	
	for(var i = 0; i < array.length; i++)
	{
		if ( array[i] > max )
		{
			max = array[i];
		}
	}
	return max;
}

function normalize(array)
{
	var output = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, array.length);	
	var max = array[0];
	var min = array[0];	
	for(var i = 0; i < array.length; i+=1)
	{
		if ( array[i] > max )
		{
			max = array[i];
		}
		if ( array[i] < min )
		{
			min = array[i];
		}
	}
	for(var i = 0; i < array.length; i+=1)	output[i] = (array[i] - min)/(max-min);
	
	return output;
}

function normalizeRange(array, F0start, F0end, stimulation, peakSearchRange)
{
	var output = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, array.length);	
	var max = array[stimulation];
	
	var minArray  = new Array(F0end-F0start);
	for (var j = 0; j < (F0end-F0start); j++)
	{
		minArray[j]=array[F0start+j];
	}
	var min = median(minArray);
	//var min = median(array.splice(F0start, F0end));


	if ( (stimulation+peakSearchRange) > array.length)
	{
		IJ.error("(stimulation frame +search range) > total nr. of frames");
		return 0;
	}
	for(var i = stimulation; i < (stimulation+peakSearchRange); i+=1)
	{
		if ( array[i] > max )
		{
			max = array[i];
		}
	}

	for(var i = 0; i < array.length; i+=1)	output[i] = (array[i] - min)/(max-min);
	
	return output;
}
function normalizeFF0(array, F0start, F0end)
{
	var output = new java.lang.reflect.Array.newInstance(java.lang.Double.TYPE, array.length);
	var minArray  = new Array(F0end-F0start);
	for (var j = 0; j < (F0end-F0start); j++)
	{
		minArray[j]=array[F0start+j];
	}
	var min = median(minArray);
	//var min = array[0];

	for(var i = 0; i < array.length; i+=1)	output[i] = (array[i]/min);
	
	return output;
}	
function getFmax(array, stimulation, searchRange)
{
	var Fmax = array[stimulation]
	var frame = stimulation
	for ( var i = stimulation; i < (stimulation+searchRange); i++)
	{
		if (array[i] > Fmax)
		{
			Fmax = array[i]
			frame = i
		}
	}

	return {
        'Fmax': Fmax,
        'frame': frame
        }; 
}
