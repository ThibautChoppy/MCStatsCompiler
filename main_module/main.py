import json
import os
import pandas as pd
import configparser
import ftplib


# 1. Import each json file and store it
# 2. Import a names.csv config file with translations from UUID to username
# 3. Leaderboard feature: Based on a category and sub-category of stats, return the leaderboard 
# 4. Bestandworst feature: Based on a username, return their position in each leaderboard of each stat, ranked from their best stat to their worst stat


def loadData(csvtoggle, csvpath, useftp, ftpserver, ftppath):
    df = pd.DataFrame()
    if useftp == "true":
        ftpserver.cwd("Minecraft")
        with open("usercache.json", "wb") as file:
            ftpserver.retrbinary(f"RETR ../data/usercache.json", file.write)
        names = pd.DataFrame(json.load(open("../data/usercache.json", "r")))
        ftpserver.cwd("../")

        # Get files
        filenames = ftpserver.nlst(ftppath)
        ftpserver.cwd(ftppath)

        for filename in filenames:
            if filename[-1] == ".":
                continue
            print("Now processing", filename)
            # Download the file to process
            local_file = f"temp_{filename}"
            with open(local_file, "wb") as file:
                ftpserver.retrbinary(f"RETR {filename}", file.write)
            with open(local_file, "r") as file:
                data = json.load(file)
            os.remove(local_file)
            
            # Import the JSON to a Pandas DF
            temp_df = pd.json_normalize(data, meta_prefix=True)
            temp_name = names.loc[names['uuid'] == filename[:-5]]['name']
            temp_df = temp_df.transpose().iloc[1:].rename({0: temp_name.iloc[0]}, axis=1)
            # Split the index (stats.blabla.blabla) into 3 indexes (stats, blabla, blabla)
            temp_df.index = temp_df.index.str.split('.', expand=True)
            if len(temp_df.index.levshape) > 3:
                temp_df.index = temp_df.index.droplevel(3)
            print(temp_df)
            temp_df.to_csv('temp.csv')
            if df.empty:
                df = temp_df
            else:
                df = df.join(temp_df, how="outer")
        
    else:
        names_file = open('../data/usercache.json', 'r')
        names = pd.DataFrame(json.load(names_file))
        for filename in os.listdir('stats'):
            if filename == ".gitignore":
                continue
            print("Now processing", filename)
            file = open('stats/' + filename)
            data = json.load(file)
            # Import the JSON to a Pandas DF
            temp_df = pd.json_normalize(data, meta_prefix=True)
            temp_name = names.loc[names['uuid'] == filename[:-5]]['name']
            temp_df = temp_df.transpose().iloc[1:].rename({0: temp_name.iloc[0]}, axis=1)
            # Split the index (stats.blabla.blabla) into 3 indexes (stats, blabla, blabla)
            temp_df.index = temp_df.index.str.split('.', expand=True)
            if len(temp_df.index.levshape) > 3:
                temp_df.index = temp_df.index.droplevel(3)
            print(temp_df)
            temp_df.to_csv('temp.csv')
            if df.empty:
                df = temp_df
            else:
                df = df.join(temp_df, how="outer")
    # Replace missing values by 0 (the stat has simply not been initialized because the associated action was not performed)
    df = df.fillna(0)
    if csvtoggle == "true":
        df.to_csv(csvpath)
    return df
    
def getLeaderboard(df, cat, subcat):
    row = df.loc['stats'].loc[cat].loc[subcat].sort_values()
    print("Leaderboard of", cat, subcat, ":")
    print(row)

def getBestAndWorst(df, username, cleaning, cleaningvalue):
    nb_players = len(os.listdir('stats'))
    if cleaning == "true":
        before_value = df.shape[0]
        df['zero_count'] = df.apply(lambda row: (row == 0).sum(), axis=1)
        df.drop(df[df['zero_count'] > (nb_players-int(cleaningvalue))].index, inplace=True)
        df = df.drop('zero_count', axis=1)
        print(before_value - df.shape[0], "rows dropped out of", before_value, "because of cleaning.")
    ranks = df.rank(axis=1, method='min', ascending=False)
    ranks['non_zero_values'] = df.apply(lambda row: nb_players - (row == 0).sum(), axis=1)
    ranks['value'] = df[username]
    output = ranks[[username, 'value', 'non_zero_values']].sort_values(username, ascending=False).rename(columns={username:"rank_"+username, "value":"value_"+username})
    print(output) # add .to_string() for the whole output


# Read config
config = configparser.ConfigParser()
config.read('main_config.ini')

# Connect to FTP if activated
ftp_server = None
if config['FTP']['UseFTP'] == "true":
    ftp_server = ftplib.FTP(config['FTP']['Host'], open("../username.txt", "r").read(), open("../password.txt", "r").read())
    ftp_server.encoding = "utf-8"


# Load the data
df = loadData(config['LEADERBOARD']['CreateCSV'], config['LEADERBOARD']['CSVPath'], config['FTP']['UseFTP'], ftp_server, config['FTP']['Path'])

# First leaderboard testing
if config['LEADERBOARD']['Enable'] == "true":
    getLeaderboard(df, config['LEADERBOARD']['Category'], config['LEADERBOARD']['Subcategory'])

# First bestandworst testing
if config['BESTANDWORST']['Enable'] == "true":
    getBestAndWorst(df, config['BESTANDWORST']['Username'], config['BESTANDWORST']['Cleaning'], config['BESTANDWORST']['CleaningValue'])


# Close the Connection
if config['FTP']['UseFTP'] == "true":
    ftp_server.quit()