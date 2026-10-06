clearvars;close all;
data = jsondecode(fileread('/Users/anna/Desktop/firexport_basic_1791057989135.json'));
allData = cellfun(@(x) cellfun(@(x) struct2table(x,'AsArray',true),x,'un',0),{data.summary},'un',0);
allData = vertcat(allData{:});
allData = vertcat(allData{:});
names = cellfun(@(x) repmat(cellstr(x),16,1),{data.DocumentID},'UniformOutput',false);
allData.ID = vertcat(names{:});
allData.type = categorical(allData.type);
allData.presence = categorical(allData.presence);
allData.meanRT(cellfun(@isempty, allData.meanRT)) = {NaN};
allData.meanRT = cell2mat(allData.meanRT);
allData.ID = categorical(allData.ID);

timestamps = datetime([data.timestamp]./1000, 'ConvertFrom', 'posixtime');
figure;histogram(timestamps,100)
idTable = table(categorical({data.DocumentID}'), timestamps','VariableNames',["ID","timestamp"]);

fullsummary = groupsummary(allData,["type","presence","setSize"],"mean","meanRT");
reshapedRTs = reshape(fullsummary.mean_meanRT,[4 2 2]);
%%
figure;subplot(1,2,1);colororder([0 0 1;1 0 0]);plot(unique(allData.setSize),reshapedRTs(:,:,1),'o-');
hold on;
swarmchart(allData(allData.type=="conjunction" & allData.presence=="absent",:).setSize,allData(allData.type=="conjunction" & allData.presence=="absent",:).meanRT,'b','filled');
swarmchart(allData(allData.type=="conjunction" & allData.presence=="present",:).setSize,allData(allData.type=="conjunction" & allData.presence=="present",:).meanRT,'r','filled');
alpha(.05);
ylim([0 3000])
title(['Conjunction Search (n = ' num2str(length(unique(allData.ID))) ')']);legend({'absent' 'present'})
xlabel('Set Size');
ylabel('Mean RT (ms)');
subplot(1,2,2);colororder([0 0 1;1 0 0]);plot(unique(allData.setSize),reshapedRTs(:,:,2),'o-');
hold on;
swarmchart(allData(allData.type=="feature" & allData.presence=="absent",:).setSize,allData(allData.type=="feature" & allData.presence=="absent",:).meanRT,'b','filled');
swarmchart(allData(allData.type=="feature" & allData.presence=="present",:).setSize,allData(allData.type=="feature" & allData.presence=="present",:).meanRT,'r','filled');
ylim([0 3000])
alpha(.05);
title(['Feature Search (n = ' num2str(length(unique(allData.ID))) ')']);legend({'absent' 'present'});
xlabel('Set Size');
ylabel('Mean RT (ms)');
%%

idSummary = groupsummary(allData,"ID",["sum", "mean"],["n", "meanRT"]);
idSummary = innerjoin(idTable,idSummary);
figure;scatter(idSummary.sum_n,idSummary.mean_meanRT,'filled');