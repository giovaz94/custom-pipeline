
dfs = {}
for file in data_files:
    scenario = file.split('/')[0]
    if scenario == 'proactive-reactive-global-outliers': cols = usecols_proactive_reactive
    elif scenario == 'oracle-global-outliers': cols = usecols_oracle
    else: cols = usecols_proactive
    print(cols)
    for i in range(1, run + 1):
        df = pd.read_csv(
                data_folder+file+str(i)+".txt", 
                delim_whitespace=True,
                usecols=cols,
                names=column_names,
                skiprows=[])
        dfs[scenario] += [df]


proactive_reactive_global = pd.concat(dfs["proactive-reactive-global-outliers"]).groupby(level=0).mean()
proactive_global = pd.concat(dfs["proactive-global-outliers"]).groupby(level=0).mean()
oracle_global = pd.concat(dfs["oracle-global-outliers"]).groupby(level=0).mean()

proactive_reactive_global


for target_col, target_label, save_label, step in zip(target_cols, target_labels, save_labels, steps):
    x = dfs['oracle']['Time (ms)']
    y_msgs = dfs['oracle']['Scale Target']
    y_pred = dfs['proactive']['Scale Target']
    y_global = dfs['proactivereactive'][target_col]
    y_proactive = dfs['proactive'][target_col]
    y_oracle = dfs['oracle'][target_col]
    fig = plt.figure(figsize=[16,10])
    ax = plt.subplot(111)
    ax_background = ax.twinx()

    width = 2.7

    if save_label == 'latency':
        up = 1600
        down = -1
    elif save_label == 'deployed_instaces':
        up = 140
        down = -1
    elif save_label == 'cost':
        up = 0.08
        down = 0
    else:
        up = 7000
        down = -1



    # define plots
    pr = ax.bar(
        x, 
        y_global, 
        linestyle='solid', 
        facecolor=facecolor_hybrid,
        edgecolor=edgecolor_hybrid,
        linewidth=1.2,
        label=label_hybrid,
        zorder=1,
        width=width,
    )

    p = ax.bar(
        x+width+0.35, 
        y_proactive, 
        linestyle='solid', 
        facecolor=facecolor_proactive_global,
        edgecolor=edgecolor_proactive_global,
        linewidth=1.2,
        label=label_proactive_global, 
        zorder=10,
        width=width,
    )
    
    o = ax.bar(
        x-width-0.35, 
        y_oracle, 
        linestyle='solid',
        facecolor=facecolor_oracle,
        edgecolor=edgecolor_oracle,
        linewidth=1.2,
        label=label_oracle_global, 
        zorder=10,
        width=width,
    )


    # define background plot
    arrived_msgs = ax_background.plot(x[1:], y_msgs[1:], linestyle='dashed', label='Actual workload', color='black', zorder=1000, alpha=.55)
    predicted_msgs = ax_background.plot(x[1:], y_pred[1:], linestyle='dashed', label='Predicted workload', color='red', zorder=1000, alpha=.55)

    # set axis limits
    ax.set_yscale('linear')
    ax.set_xlim(-5, 206)
    ax.set_ylim(down, up)

    # set ticks and labels
    ax.set_ylabel(target_label, fontsize=13.5)
    ax.set_xlabel('Time (hours)', fontsize=13.5)
    ax.set_xticks(range(0, 210, 10))
    ax.set_xticklabels(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '00', '01', '02', '03', '04', '05', '06'])

    # background ticks and labels
    ax_background.set_yticks(range(0, 1000, 100))
    ax_background.grid(False)
    ax_background.yaxis.set_label_coords(1.05, 0.5)
    ax_background.set_ylabel('Workload (number of inbound messages)')

    # legend settings
    ax.legend(loc='upper center', ncol=1, frameon=True, fontsize=13.5)
    ax_background.legend(loc='upper right', ncol=1, frameon=True, fontsize=13.5)

    fig.savefig(f'../../images/proactive_reactive_vs_proactive_global_outliers/{save_label}_outliers_proactive_reactiveG_vs_proactiveG.pdf', dpi=300, format='pdf', bbox_inches='tight')